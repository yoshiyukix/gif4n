import { VideoSource, TrimRange, QualityPreset } from '../types';

// ─── ルートパラメータ定義 ────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined;
  Trim: { source: VideoSource };
  Converting: { source: VideoSource; trimRange: TrimRange; thumbnailUri: string | null };
  Result: { gifUri: string; sizeBytes: number; preset: QualityPreset };
};
