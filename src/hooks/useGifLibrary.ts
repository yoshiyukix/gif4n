import { useCallback, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { getGifEntries, LibraryGifEntry } from '../infrastructure/GifLibraryStore';

export type { LibraryGifEntry };

export type GifItem = { entry: LibraryGifEntry; localUri: string };

export interface UseGifLibraryResult {
  items: GifItem[];
  loading: boolean;
  loadItems(): Promise<void>;
}

/**
 * GifLibraryStore から GIF エントリを取得し、MediaLibrary のローカル URI を解決する
 * wiring hook。Presentation 層が Infrastructure を直接依存しないようにするためのラッパー。
 */
export function useGifLibrary(): UseGifLibraryResult {
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { granted } = await MediaLibrary.requestPermissionsAsync();
    if (!granted) {
      setLoading(false);
      return;
    }
    const entries = await getGifEntries();
    const resolved: GifItem[] = [];
    for (const entry of entries) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        const localUri = info.localUri ?? info.uri;
        if (localUri) resolved.push({ entry, localUri });
      } catch {
        // カメラロールから削除済みのエントリはスキップ
      }
    }
    setItems(resolved);
    setLoading(false);
  }, []);

  return { items, loading, loadItems };
}
