import { VideoSource, TrimRange, QualityPreset } from '../types';

// ─── Studio（動画→GIF変換）スタック ────────────────────────────────

export type StudioStackParamList = {
  Home: undefined;
  Trim: { source: VideoSource };
  Converting: {
    source: VideoSource;
    trimRange: TrimRange;
    thumbnailUri: string | null;
  };
  Result: { gifUri: string; sizeBytes: number; preset: QualityPreset };
  Settings: undefined;
  Licenses: undefined;
};

// 後方互換エイリアス（既存コードが RootStackParamList を参照している場合用）
// Settings / Licenses を含む全画面を包括する
export type RootStackParamList = StudioStackParamList;
