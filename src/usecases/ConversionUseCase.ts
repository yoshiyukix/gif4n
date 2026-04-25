import { VideoSource, TrimRange, ConversionResult, QualityPreset, QUALITY_PRESETS } from '../types';
import { INativeGifService } from '../infrastructure/NativeGifService';
import { ISizeEstimator } from './SizeEstimator';

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * 出力 GIF の URI からファイルサイズ（バイト）を返す関数。
 * Infrastructure 層で実装し、UseCase に注入する。
 */
export type OutputSizeResolver = (uri: string) => Promise<number> | number;

/** ConversionUseCase.run() のオプションパラメーター */
export interface ConversionRunOptions {
  onProgress: (rate: number) => void;
  signal: AbortSignal;
  outputSizeResolver: OutputSizeResolver;
  onPresetChange?: (preset: QualityPreset) => void;
  maxSizeBytes?: number;
  startIndexOverride?: number;
}

export interface IConversionUseCase {
  /**
   * 品質を自動調整しながら GIF を生成する。
   * maxSizeBytes 以内に収まる最高品質の preset を試行順に探索する。
   */
  run(
    source: VideoSource,
    trim: TrimRange,
    options: ConversionRunOptions,
  ): Promise<ConversionResult>;
}

export class ConversionUseCase implements IConversionUseCase {
  constructor(
    private readonly native: INativeGifService,
    private readonly estimator: ISizeEstimator,
  ) {}

  async run(
    source: VideoSource,
    trim: TrimRange,
    options: ConversionRunOptions,
  ): Promise<ConversionResult> {
    const {
      onProgress,
      signal,
      outputSizeResolver,
      onPresetChange,
      maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
      startIndexOverride,
    } = options;

    const startIndex =
      startIndexOverride ?? this.estimator.estimateStartIndex(source, trim, maxSizeBytes);

    for (let i = startIndex; i < QUALITY_PRESETS.length; i++) {
      if (signal.aborted) {
        return { ok: false, reason: 'cancelled', message: 'キャンセルされました' };
      }

      const preset = QUALITY_PRESETS[i];
      onPresetChange?.(preset);

      let outputUri: string;
      try {
        outputUri = await this.native.convert(source, trim, preset, onProgress, signal);
      } catch (err: unknown) {
        if (signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return { ok: false, reason: 'cancelled', message: 'キャンセルされました' };
        }
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: 'native_error', message };
      }

      const sizeBytes = await outputSizeResolver(outputUri);

      if (sizeBytes <= maxSizeBytes) {
        return { ok: true, outputUri, sizeBytes, preset };
      }
      // maxSizeBytes 超 → 次の preset で再試行
    }

    const limitMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      ok: false,
      reason: 'too_large',
      message: `全品質設定で ${limitMb}MB を超えました。動画を短くトリミングしてください。`,
    };
  }
}
