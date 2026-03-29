import { VideoSource, TrimRange, QualityPreset } from '../types';

// ─── ルートパラメータ定義 ────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined;
  Trim: { source: VideoSource };
  Confirm: { source: VideoSource; trimRange: TrimRange };
  Converting: { source: VideoSource; trimRange: TrimRange };
  Result: { gifUri: string; sizeBytes: number; preset: QualityPreset };
};
