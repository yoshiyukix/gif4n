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
  await getFile().write(JSON.stringify(updated));
}

export async function getGifEntries(): Promise<LibraryGifEntry[]> {
  const file = getFile();
  if (!file.exists) return [];
  try {
    const content = await file.text();
    const raw: unknown = JSON.parse(content);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (e): e is LibraryGifEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as LibraryGifEntry).assetId === 'string' &&
        typeof (e as LibraryGifEntry).sizeBytes === 'number' &&
        typeof (e as LibraryGifEntry).createdAt === 'number' &&
        typeof (e as LibraryGifEntry).preset === 'object' &&
        (e as LibraryGifEntry).preset !== null &&
        typeof (e as LibraryGifEntry).preset?.width === 'number' &&
        typeof (e as LibraryGifEntry).preset?.fps === 'number' &&
        ([320, 480, 620] as number[]).includes((e as LibraryGifEntry).preset.width) &&
        ([10, 15] as number[]).includes((e as LibraryGifEntry).preset.fps),
    );
  } catch {
    return [];
  }
}
