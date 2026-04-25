import { useMemo, useState } from 'react';
import { MediaService } from '../infrastructure/MediaService';
import { addGifEntry } from '../infrastructure/GifLibraryStore';
import { QualityPreset } from '../types';

export interface UseMediaActionsResult {
  isSaving: boolean;
  isSharing: boolean;
  saveGif(gifUri: string, sizeBytes: number, preset: QualityPreset): Promise<void>;
  shareGif(uri: string): Promise<void>;
}

/**
 * MediaService のインスタンスを生成し、GIF の保存・共有操作を提供する wiring hook。
 * Presentation 層が Infrastructure を直接依存しないようにするためのラッパー。
 */
export function useMediaActions(): UseMediaActionsResult {
  const media = useMemo(() => new MediaService(), []);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  async function saveGif(gifUri: string, sizeBytes: number, preset: QualityPreset): Promise<void> {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const assetId = await media.saveToLibrary(gifUri);
      await addGifEntry({ assetId, sizeBytes, preset, createdAt: Date.now() });
    } finally {
      setIsSaving(false);
    }
  }

  async function shareGif(uri: string): Promise<void> {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await media.share(uri);
    } finally {
      setIsSharing(false);
    }
  }

  return { isSaving, isSharing, saveGif, shareGif };
}
