import { NavigatorScreenParams } from '@react-navigation/native';
import { VideoSource, TrimRange, QualityPreset } from '../types';

// ─── Studio（動画→GIF変換）スタック ────────────────────────────────

export type StudioStackParamList = {
  Home: undefined;
  Trim: { source: VideoSource };
  Converting: { source: VideoSource; trimRange: TrimRange; thumbnailUri: string | null };
  Result: { gifUri: string; sizeBytes: number; preset: QualityPreset };
};

// ─── Library（保存済みGIF一覧）スタック ────────────────────────────

export type LibraryStackParamList = {
  Library: undefined;
  LibraryDetail: {
    assetId: string;
    localUri: string;
    sizeBytes: number;
    preset: QualityPreset;
    createdAt: number;
  };
};

// ─── Settings スタック ──────────────────────────────────────────────

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Licenses: undefined;
};

// ─── ルートタブ ─────────────────────────────────────────────────────

export type RootTabParamList = {
  Studio: NavigatorScreenParams<StudioStackParamList>;
  Library: NavigatorScreenParams<LibraryStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

// 後方互換エイリアス（既存コードが RootStackParamList を参照している場合用）
export type RootStackParamList = StudioStackParamList;
