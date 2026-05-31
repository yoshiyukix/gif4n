import { useState, useEffect } from 'react';
import type { VideoAssetReference } from '../types';
import { videoThumbnailService } from '../infrastructure/VideoThumbnailService';

type AssetLike = Pick<VideoAssetReference, 'id' | 'uri'>;

/**
 * 動画アセットのサムネイル URI を非同期で生成して返す hook。
 * 権限エラーを避けるため、アクセス元に関わらず必ずキャッシュへコピーしてからサムネイルを生成する。
 * アンマウント時またはアセット変更時に処理を中断する。
 */
export function useVideoThumbnail(asset: AssetLike, enabled = true): string | null {
  const { id, uri } = asset;
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setThumbUri(null);
    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const nextUri = await videoThumbnailService.getVisibleThumbnail({ id, uri });
      if (!cancelled) setThumbUri(nextUri);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, id, uri]);

  return thumbUri;
}
