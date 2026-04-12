import { VideoSource, TrimRange, ConversionResult, QualityPreset, QUALITY_PRESETS } from '../types';
import { INativeGifService } from '../infrastructure/NativeGifService';
import { ISizeEstimator } from './SizeEstimator';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * 出力 GIF の URI からファイルサイズ（バイト）を返す関数。
 * Infrastructure 層で実装し、UseCase に注入する。
 */
export type OutputSizeResolver = (uri: string) => Promise<number> | number;

export interface IConversionUseCase {
  /**
   * 品質を自動調整しながら GIF を生成する。
   * 10 MB 以内に収まる最高品質の preset を試行順に探索する。
   */
  run(
    source: VideoSource,
    trim: TrimRange,
    onProgress: (rate: number) => void,
    signal: AbortSignal,
    outputSizeResolver: OutputSizeResolver,
    onPresetChange?: (preset: QualityPreset) => void,
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
    onProgress: (rate: number) => void,
    signal: AbortSignal,
    outputSizeResolver: OutputSizeResolver,
    onPresetChange?: (preset: QualityPreset) => void,
  ): Promise<ConversionResult> {
    const startIndex = this.estimator.estimateStartIndex(source, trim);

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

      if (sizeBytes <= MAX_SIZE_BYTES) {
        return { ok: true, outputUri, sizeBytes, preset };
      }
      // 10MB 超 → 次の preset で再試行
    }

    return {
      ok: false,
      reason: 'too_large',
      message: '全品質設定で 10MB を超えました。動画を短くトリミングしてください。',
    };
  }
}
