import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import type { VideoAssetReference, VideoSource } from '../types';
import { normalizeMediaLibraryUri } from '../utils/mediaUtils';

type AssetLike = Pick<VideoAssetReference, 'id' | 'uri'>;
type SourceLike = Pick<VideoSource, 'uri'>;

export interface IVideoThumbnailService {
  getVisibleThumbnail(asset: AssetLike): Promise<string | null>;
  getConversionPreviewThumbnail(source: SourceLike, timeMs: number): Promise<string | null>;
}

export class VideoThumbnailService implements IVideoThumbnailService {
  private readonly thumbnailCache = new Map<string, string>();

  async getVisibleThumbnail(asset: AssetLike): Promise<string | null> {
    const cachedUri = this.thumbnailCache.get(asset.id);
    if (cachedUri) return cachedUri;

    const info = await MediaLibrary.getAssetInfoAsync(asset.id);
    const localUri = normalizeMediaLibraryUri(info.localUri ?? '');
    if (!localUri) {
      // eslint-disable-next-line no-console
      console.warn('[VideoThumbnailService] no localUri', asset.uri);
      return null;
    }

    const ext = localUri.split('.').pop() ?? 'mov';
    const safeId = asset.id.replace(/\//g, '_');
    const tempUri = `${FileSystem.cacheDirectory}thumb-${safeId}.${ext}`;

    try {
      await FileSystem.copyAsync({ from: localUri, to: tempUri });
      const { uri } = await VideoThumbnails.getThumbnailAsync(tempUri, { time: 0 });
      this.thumbnailCache.set(asset.id, uri);
      return uri;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[VideoThumbnailService] visible thumbnail failed', asset.uri, e);
      return null;
    } finally {
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    }
  }

  async getConversionPreviewThumbnail(source: SourceLike, timeMs: number): Promise<string | null> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(source.uri, { time: timeMs });
      return uri;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[VideoThumbnailService] conversion preview thumbnail failed', source.uri, e);
      return null;
    }
  }
}

export const videoThumbnailService = new VideoThumbnailService();
