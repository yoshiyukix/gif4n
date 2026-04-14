import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoSource } from '../types';

type ImportableAsset = Pick<
  MediaLibrary.Asset,
  'id' | 'filename' | 'duration' | 'width' | 'height' | 'uri'
>;

export interface IVideoImportService {
  importAsset(asset: ImportableAsset): Promise<VideoSource>;
}

export function normalizeMediaLibraryUri(uri: string): string {
  const hashIndex = uri.indexOf('#');
  return hashIndex >= 0 ? uri.slice(0, hashIndex) : uri;
}

export class VideoImportService implements IVideoImportService {
  async importAsset(asset: ImportableAsset): Promise<VideoSource> {
    const info = await MediaLibrary.getAssetInfoAsync(asset.id);
    const sourceUri = normalizeMediaLibraryUri(info.localUri ?? asset.uri);
    const directoryUri = `${FileSystem.cacheDirectory}selected-videos/`;
    const fileName = this.makeFileName(asset);
    const destinationUri = `${directoryUri}${fileName}`;

    await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    const importedInfo = await FileSystem.getInfoAsync(destinationUri);

    return {
      uri: destinationUri,
      durationSec: asset.duration,
      width: asset.width,
      height: asset.height,
      fileSizeBytes: importedInfo.exists ? (importedInfo.size ?? 0) : 0,
    };
  }

  private makeFileName(asset: ImportableAsset): string {
    const uniqueId = Math.random().toString(36).slice(2, 12);
    const extension = this.getFileExtension(asset.filename);
    return `${uniqueId}${extension}`;
  }

  private getFileExtension(filename: string): string {
    return filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '.mp4';
  }
}
