import { File, Paths } from 'expo-file-system';
import { QualityPreset } from '../types';

// ─── 型定義 ────────────────────────────────────────────

export type LibraryGifEntry = {
  assetId: string;
  sizeBytes: number;
  preset: QualityPreset;
  createdAt: number;
};

// ─── ヘルパー ──────────────────────────────────────────

function getFile(): File {
  return new File(Paths.document, 'gif-library.json');
}

// ─── 操作 ────────────────────────────────────────────

export async function addGifEntry(entry: LibraryGifEntry): Promise<void> {
  const existing = await getGifEntries();
  const updated = [entry, ...existing];
  getFile().write(JSON.stringify(updated));
}

export async function getGifEntries(): Promise<LibraryGifEntry[]> {
  const file = getFile();
  if (!file.exists) return [];
  try {
    const content = await file.text();
    return JSON.parse(content) as LibraryGifEntry[];
  } catch {
    return [];
  }
}
