import { VideoSource, TrimRange, QualityPreset } from '../types';

/** Hermes には DOMException がないため独自定義 */
export class AbortError extends Error {
  readonly name = 'AbortError';
  constructor() { super('cancelled'); }
}

export interface INativeGifService {
  /**
   * Platform Channel 経由でネイティブ GIF 変換を実行する。
   * iOS: AVFoundation + ImageIO
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
 *   - iOS: AVFoundation + ImageIO (Swift) — ios/GifToNoteModule.swift
 *   - Android: gifski NDK (Kotlin) — android/.../GifToNoteModule.kt
 */
export class NativeGifService implements INativeGifService {
  private native: GifToNoteNativeModule | null = null;

  private getModule(): GifToNoteNativeModule {
    if (!this.native) {
      // requireNativeModule は Expo Modules API のエントリポイント
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { requireNativeModule } = require('expo-modules-core') as {
        requireNativeModule: (name: string) => GifToNoteNativeModule;
      };
      this.native = requireNativeModule('GifToNote');
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
    const subscription = module.addListener(
      'onProgress',
      (data: Record<string, unknown>) => {
        if (data.sessionId === sessionId) {
          onProgress(data.progress as number);
        }
      },
    );

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
}
