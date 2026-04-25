import { requireNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import {
  VideoSource,
  TrimRange,
  QualityPreset,
  QUALITY_PRESETS,
  PILOT_PRESET_INDEX,
} from '../types';

/** パイロット変換で各サンプル点をカバーする秒数（後から変更しやすいよう定数化） */
const PILOT_SAMPLE_DURATION_SEC = 1.0;

/** パイロット変換のサンプル位置（動画全体長に対する相対位置） */
const PILOT_SAMPLE_POSITIONS = [0.25, 0.5, 0.75] as const;

/** Hermes には DOMException がないため独自定義 */
export class AbortError extends Error {
  readonly name = 'AbortError';
  constructor() {
    super('cancelled');
  }
}

export interface INativeGifService {
  /**
   * Platform Channel 経由でネイティブ GIF 変換を実行する。
   * iOS: AVFoundation + gifski (Swift)
   * Android: gifski (Kotlin ネイティブモジュール)
   * @returns 出力 GIF のローカル URI
   */
  convert(
    source: VideoSource,
    trim: TrimRange,
    preset: QualityPreset,
    onProgress: (rate: number) => void,
    signal: AbortSignal,
  ): Promise<string>;

  /**
   * 25%・50%・75% 地点の各 PILOT_SAMPLE_DURATION_SEC 秒を中間品質 preset (480px/10fps) で変換し、
   * 1 秒あたりのバイト数の平均を返す。
   * 変換に使用した一時ファイルは内部で削除する。
   * キャンセル時は AbortError をスローする。ネイティブエラー時は例外をそのまま伝播する。
   */
  convertPilot(source: VideoSource, signal: AbortSignal): Promise<number>;
}
// ─── ネイティブモジュール型定義 ───────────────────────

interface GifToNoteNativeModule {
  convertToGif(params: {
    uri: string;
    startSec: number;
    endSec: number;
    outputWidth: number;
    fps: number;
    sessionId: string;
  }): Promise<string>;
  cancelConversion(sessionId: string): Promise<void>;
  /** Expo イベント購読（"onProgress" に対応） */
  addListener(
    eventName: string,
    callback: (data: Record<string, unknown>) => void,
  ): { remove: () => void };
  removeListeners(count: number): void;
}

// ─── 実装 ────────────────────────────────────────────

/**
 * Expo Modules API（Platform Channel）経由で iOS / Android のネイティブ GIF 変換を呼び出す。
 *
 * 実機実装:
 *   - iOS: AVFoundation + gifski (Swift) — ios/GifToNoteModule.swift
 *   - Android: gifski NDK (Kotlin) — android/.../GifToNoteModule.kt
 */
export class NativeGifService implements INativeGifService {
  private native: GifToNoteNativeModule | null = null;

  private getModule(): GifToNoteNativeModule {
    if (!this.native) {
      // requireNativeModule は Expo Modules API のエントリポイント
      this.native = requireNativeModule<GifToNoteNativeModule>('GifToNote');
    }
    return this.native!;
  }

  async convert(
    source: VideoSource,
    trim: TrimRange,
    preset: QualityPreset,
    onProgress: (rate: number) => void,
    signal: AbortSignal,
  ): Promise<string> {
    if (signal.aborted) {
      throw new AbortError();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const module = this.getModule();

    // Expo イベントで進捗を受け取る（セッション ID でフィルタリング）
    const subscription = module.addListener('onProgress', (data: Record<string, unknown>) => {
      if (data.sessionId === sessionId && typeof data.progress === 'number') {
        onProgress(data.progress);
      }
    });

    // キャンセル時にネイティブセッションを中断
    const abortHandler = () => {
      module.cancelConversion(sessionId).catch(() => {});
    };
    signal.addEventListener('abort', abortHandler);

    try {
      const outputUri = await module.convertToGif({
        uri: source.uri,
        startSec: trim.startSec,
        endSec: trim.endSec,
        outputWidth: preset.width,
        fps: preset.fps,
        sessionId,
      });
      return outputUri;
    } finally {
      subscription.remove();
      signal.removeEventListener('abort', abortHandler);
    }
  }

  async convertPilot(source: VideoSource, signal: AbortSignal): Promise<number> {
    if (source.durationSec <= 0) {
      return 0;
    }

    // 中間品質プリセット (PILOT_PRESET_INDEX = 480px/10fps) で変換 → 最高品質への外挿倍率が ~2.5倍に縮小し推定精度が向上する
    const pilotPreset = QUALITY_PRESETS[PILOT_PRESET_INDEX];
    const actualDuration = Math.min(PILOT_SAMPLE_DURATION_SEC, source.durationSec);

    const samples: number[] = [];
    for (const pos of PILOT_SAMPLE_POSITIONS) {
      const centerSec = pos * source.durationSec;
      const startSec = Math.max(
        0,
        Math.min(centerSec - actualDuration / 2, source.durationSec - actualDuration),
      );
      const pilotTrim: TrimRange = { startSec, endSec: startSec + actualDuration };

      const outputUri = await this.convert(source, pilotTrim, pilotPreset, () => {}, signal);

      let sizeBytes = 0;
      try {
        const info = await FileSystem.getInfoAsync(outputUri);
        sizeBytes = info.exists ? (info.size ?? 0) : 0;
      } catch {
        sizeBytes = 0;
      }

      FileSystem.deleteAsync(outputUri, { idempotent: true }).catch(() => {});

      const bytesPerSec = sizeBytes / actualDuration;
      if (bytesPerSec > 0) {
        samples.push(bytesPerSec);
      }
    }

    if (samples.length === 0) {
      return 0;
    }
    return samples.reduce((sum, v) => sum + v, 0) / samples.length;
  }
}
