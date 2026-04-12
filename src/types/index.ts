// ────────────────────────────────────────────────
// VideoSource
// ────────────────────────────────────────────────

/** 選択した動画の情報 */
export interface VideoSource {
  /** ローカルファイルの URI */
  uri: string;
  /** 動画の総秒数 */
  durationSec: number;
  /** 動画の幅（px） */
  width: number;
  /** 動画の高さ（px） */
  height: number;
  /** 元ファイルサイズ（バイト） */
  fileSizeBytes: number;
}

// ────────────────────────────────────────────────
// TrimRange
// ────────────────────────────────────────────────

/** トリミング範囲 */
export interface TrimRange {
  /** 開始時間（秒） */
  startSec: number;
  /** 終了時間（秒） */
  endSec: number;
}

// ────────────────────────────────────────────────
// QualityPreset
// ────────────────────────────────────────────────

/** 変換品質の 1 段階を表す */
export interface QualityPreset {
  /** 出力幅（px） */
  width: 320 | 480 | 620;
  /** フレームレート */
  fps: 5 | 10 | 15;
}

/**
 * F-022 品質試行順位（優先度の高い順）
 * 1位: 620px/15fps → 9位: 320px/5fps
 */
export const QUALITY_PRESETS: QualityPreset[] = [
  { width: 620, fps: 15 },
  { width: 620, fps: 10 },
  { width: 480, fps: 15 },
  { width: 620, fps: 5 },
  { width: 480, fps: 10 },
  { width: 320, fps: 15 },
  { width: 480, fps: 5 },
  { width: 320, fps: 10 },
  { width: 320, fps: 5 },
];

// ────────────────────────────────────────────────
// ConversionStatus
// ────────────────────────────────────────────────

export type ConversionStatus =
  | 'idle' // 未開始
  | 'running' // 変換中
  | 'checking' // サイズ確認中（再試行判定）
  | 'done' // 完了
  | 'cancelled' // キャンセル済み
  | 'error'; // エラー

// ────────────────────────────────────────────────
// ConversionJob
// ────────────────────────────────────────────────

/** 変換処理の全パラメーターと状態 */
export interface ConversionJob {
  /** 入力動画 */
  source: VideoSource;
  /** トリミング範囲 */
  trim: TrimRange;
  /** 現在試行中の品質設定 */
  preset: QualityPreset;
  /** 変換状態 */
  status: ConversionStatus;
  /** 進捗（0.0〜1.0） */
  progressRate: number;
  /** 出力 GIF のローカル URI */
  outputUri: string | null;
  /** 出力ファイルサイズ（バイト） */
  outputSizeBytes: number | null;
  /** エラー時のメッセージ */
  errorMessage?: string;
}

// ────────────────────────────────────────────────
// ConversionResult
// ────────────────────────────────────────────────

/** GIF 変換の結果（判別共用体） */
export type ConversionResult =
  | {
      ok: true;
      outputUri: string;
      sizeBytes: number;
      preset: QualityPreset;
    }
  | {
      ok: false;
      reason: 'too_large' | 'cancelled' | 'native_error';
      message: string;
    };
