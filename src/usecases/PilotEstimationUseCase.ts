import { VideoSource, QUALITY_PRESETS, PILOT_PRESET_INDEX } from '../types';
import { INativeGifService } from '../infrastructure/NativeGifService';

// パイロット変換に使用するプリセット（中間品質 = 最高品質への外挿倍率を最小化）
const PILOT_PRESET = QUALITY_PRESETS[PILOT_PRESET_INDEX];

// パイロット変換は PILOT_PRESET（中間品質）で測定するため、PILOT_PRESET を基準(1.0)として
// 各プリセットのスケール係数を計算する。
// GIF サイズは出力ピクセル数 × fps に比例するため:
//   scale_i = (w_i² × fps_i) / (pilot_w² × pilot_fps)
const PRESET_SCALE_FACTORS: number[] = QUALITY_PRESETS.map(
  (p) => (p.width * p.width * p.fps) / (PILOT_PRESET.width * PILOT_PRESET.width * PILOT_PRESET.fps),
);

export interface IPilotEstimationUseCase {
  /**
   * パイロット変換を実行し、1 秒あたりのバイト数を返す。
   * キャンセル・失敗時は null を返す。
   */
  run(source: VideoSource, signal: AbortSignal): Promise<number | null>;

  /**
   * パイロット変換で得た bytes/sec とトリム秒数から最適な開始プリセットインデックスを返す。
   * @param bytesPerSec   パイロット変換で実測した 1 秒あたりのバイト数
   * @param trimDurationSec トリム後の動画秒数
   * @param maxSizeBytes  許容最大サイズ（バイト）
   * @returns 0〜5 のインデックス（QUALITY_PRESETS の添字）
   */
  estimateStartIndex(bytesPerSec: number, trimDurationSec: number, maxSizeBytes: number): number;
}

export class PilotEstimationUseCase implements IPilotEstimationUseCase {
  constructor(private readonly native: INativeGifService) {}

  async run(source: VideoSource, signal: AbortSignal): Promise<number | null> {
    try {
      const result = await this.native.convertPilot(source, signal);
      // 0 バイトは信頼できない計測値として無効扱いにする
      return result > 0 ? result : null;
    } catch {
      return null;
    }
  }

  estimateStartIndex(bytesPerSec: number, trimDurationSec: number, maxSizeBytes: number): number {
    for (let i = 0; i < QUALITY_PRESETS.length; i++) {
      const estimated = bytesPerSec * trimDurationSec * PRESET_SCALE_FACTORS[i];
      if (estimated <= maxSizeBytes) {
        return i;
      }
    }
    return QUALITY_PRESETS.length - 1;
  }
}
