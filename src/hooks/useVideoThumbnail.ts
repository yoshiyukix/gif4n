import { useState, useEffect } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { normalizeMediaLibraryUri } from '../utils/mediaUtils';

type AssetLike = Pick<MediaLibrary.Asset, 'id' | 'uri'>;

const thumbnailCache = new Map<string, string>();

/**
 * 動画アセットのサムネイル URI を非同期で生成して返す hook。
 * 権限エラーを避けるため、アクセス元に関わらず必ずキャッシュへコピーしてからサムネイルを生成する。
 * アンマウント時またはアセット変更時に処理を中断する。
 */
export function useVideoThumbnail(asset: AssetLike, enabled = true): string | null {
  const [thumbUri, setThumbUri] = useState<string | null>(
    () => thumbnailCache.get(asset.id) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    const cachedUri = thumbnailCache.get(asset.id);

    if (cachedUri) {
      setThumbUri(cachedUri);
      return () => {
        cancelled = true;
      };
    }

    setThumbUri(null);
    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const info = await MediaLibrary.getAssetInfoAsync(asset.id);
      const localUri = normalizeMediaLibraryUri(info.localUri ?? '');
      if (!localUri) {
        // eslint-disable-next-line no-console
        console.warn('[useVideoThumbnail] no localUri', asset.uri);
        return;
      }
      const ext = localUri.split('.').pop() ?? 'mov';
      const safeId = asset.id.replace(/\//g, '_');
      const tempUri = `${FileSystem.cacheDirectory}thumb-${safeId}.${ext}`;
      try {
        await FileSystem.copyAsync({ from: localUri, to: tempUri });
        const { uri } = await VideoThumbnails.getThumbnailAsync(tempUri, { time: 0 });
        thumbnailCache.set(asset.id, uri);
        if (!cancelled) setThumbUri(uri);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[useVideoThumbnail] thumbnail failed', asset.uri, e);
      } finally {
        FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.uri, enabled]);

  return thumbUri;
}
