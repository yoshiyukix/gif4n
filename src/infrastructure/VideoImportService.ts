import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { createVideoPlayer } from 'expo-video';
import { VideoSource } from '../types';
import { normalizeMediaLibraryUri } from '../utils/mediaUtils';

export { normalizeMediaLibraryUri } from '../utils/mediaUtils';

type ImportableAsset = Pick<
  MediaLibrary.Asset,
  'id' | 'filename' | 'duration' | 'width' | 'height' | 'uri'
>;

export interface IVideoImportService {
  importAsset(asset: ImportableAsset): Promise<VideoSource>;
  /** DocumentPicker 等で取得したファイル URI から VideoSource を生成する（F-002）*/
  importFileUri(fileUri: string, filename: string, fileSize: number): Promise<VideoSource>;
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

  async importFileUri(fileUri: string, filename: string, fileSize: number): Promise<VideoSource> {
    const directoryUri = `${FileSystem.cacheDirectory}selected-videos/`;
    const extension = this.getFileExtension(filename);
    const uniqueId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    const destinationUri = `${directoryUri}${uniqueId}${extension}`;

    await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
    await FileSystem.copyAsync({ from: fileUri, to: destinationUri });

    const importedInfo = await FileSystem.getInfoAsync(destinationUri);
    const durationSec = await this.getVideoDurationSec(destinationUri);

    return {
      uri: destinationUri,
      durationSec,
      // DocumentPicker は動画寸法を提供しないため標準 HD を仮定する。
      // SizeEstimator のアスペクト比推定に使用されるが、パイロット変換で実測値に補正される。
      width: 1920,
      height: 1080,
      fileSizeBytes: importedInfo.exists ? (importedInfo.size ?? fileSize) : fileSize,
    };
  }

  /**
   * expo-video の VideoPlayer で動画をロードし、再生可能になった時点の duration を返す。
   * 5 秒以内に取得できない場合は 0 を返す（useTrim が 60 秒フォールバックを使用する）。
   */
  private getVideoDurationSec(uri: string): Promise<number> {
    const TIMEOUT_MS = 5_000;
    const FALLBACK_SEC = 0;

    return new Promise((resolve) => {
      const player = createVideoPlayer(uri);

      const timeoutId = setTimeout(() => {
        sub.remove();
        player.release();
        resolve(FALLBACK_SEC);
      }, TIMEOUT_MS);

      const sub = player.addListener('statusChange', ({ status }) => {
        if (status === 'readyToPlay') {
          clearTimeout(timeoutId);
          sub.remove();
          const dur = player.duration;
          player.release();
          resolve(dur > 0 ? dur : FALLBACK_SEC);
        } else if (status === 'error') {
          clearTimeout(timeoutId);
          sub.remove();
          player.release();
          resolve(FALLBACK_SEC);
        }
      });
    });
  }

  private getFileExtension(filename: string): string {
    return filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '.mp4';
  }
}
