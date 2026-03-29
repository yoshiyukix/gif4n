import { VideoSource, TrimRange, QualityPreset, QUALITY_PRESETS } from '../types';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ESTIMATION_COEFFICIENT = 0.010;

export interface ISizeEstimator {
  /**
   * 変換前に GIF サイズを近似推定し、最初に試すべき preset インデックスを返す。
   * 推定式: outputWidth × outputHeight × fps × durationSec × 係数(0.010)
   * @returns 0〜8 のインデックス（QUALITY_PRESETS の添字）
   */
  estimateStartIndex(source: VideoSource, trim: TrimRange): number;
}

export class SizeEstimator implements ISizeEstimator {
  /**
   * preset ごとに推定バイト数を計算する。
   * 出力高さは動画のアスペクト比を保持して preset.width からスケールする。
   */
  estimateBytes(source: VideoSource, trim: TrimRange, preset: QualityPreset): number {
    const durationSec = trim.endSec - trim.startSec;
    const aspectRatio = source.height / source.width;
    const outputHeight = preset.width * aspectRatio;
    return preset.width * outputHeight * preset.fps * durationSec * ESTIMATION_COEFFICIENT;
  }

  estimateStartIndex(source: VideoSource, trim: TrimRange): number {
    for (let i = 0; i < QUALITY_PRESETS.length; i++) {
      const bytes = this.estimateBytes(source, trim, QUALITY_PRESETS[i]);
      if (bytes <= MAX_SIZE_BYTES) {
        return i;
      }
    }
    // 全 preset で超過 → 最低品質（インデックス 8）で挑む
    return QUALITY_PRESETS.length - 1;
  }
}
