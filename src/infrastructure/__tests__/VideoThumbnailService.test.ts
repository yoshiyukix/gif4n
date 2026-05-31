import * as MediaLibraryModule from 'expo-media-library';
import * as VideoThumbnailsModule from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoThumbnailService } from '../VideoThumbnailService';

jest.mock('expo-media-library', () => ({
  getAssetInfoAsync: jest.fn(),
}));

jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock/cache/',
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

const MediaLibrary = jest.mocked(
  MediaLibraryModule as unknown as {
    getAssetInfoAsync: jest.Mock;
  },
);

const VideoThumbnails = jest.mocked(
  VideoThumbnailsModule as unknown as {
    getThumbnailAsync: jest.Mock;
  },
);

const ExpoFileSystem = jest.mocked(
  FileSystem as unknown as {
    cacheDirectory: string;
    copyAsync: jest.Mock;
    deleteAsync: jest.Mock;
  },
);

describe('VideoThumbnailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({
      localUri: 'file:///var/mobile/Media/DCIM/101APPLE/IMG_1648.MP4',
    });
    VideoThumbnails.getThumbnailAsync.mockResolvedValue({ uri: 'file:///tmp/thumb.jpg' });
    ExpoFileSystem.copyAsync.mockResolvedValue(undefined);
    ExpoFileSystem.deleteAsync.mockResolvedValue(undefined);
  });

  it('Visible Thumbnail 用に localUri を一時コピーしてサムネイルを返す', async () => {
    const service = new VideoThumbnailService();

    const result = await service.getVisibleThumbnail({
      id: 'asset-1',
      uri: 'ph://asset-1',
    });

    expect(ExpoFileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///var/mobile/Media/DCIM/101APPLE/IMG_1648.MP4',
      to: 'file:///mock/cache/thumb-asset-1.MP4',
    });
    expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith(
      'file:///mock/cache/thumb-asset-1.MP4',
      { time: 0 },
    );
    expect(result).toBe('file:///tmp/thumb.jpg');
  });

  it('Visible Thumbnail は同じ asset に対してキャッシュを再利用する', async () => {
    const service = new VideoThumbnailService();
    const asset = { id: 'asset-1', uri: 'ph://asset-1' };

    await service.getVisibleThumbnail(asset);
    await service.getVisibleThumbnail(asset);

    expect(MediaLibrary.getAssetInfoAsync).toHaveBeenCalledTimes(1);
    expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledTimes(1);
  });

  it('localUri が解決できなければ null を返す', async () => {
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: undefined });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const service = new VideoThumbnailService();

    await expect(service.getVisibleThumbnail({ id: 'asset-1', uri: 'ph://asset-1' })).resolves.toBe(
      null,
    );

    warnSpy.mockRestore();
  });

  it('変換プレビュー用は source.uri から直接サムネイルを返す', async () => {
    const service = new VideoThumbnailService();

    const result = await service.getConversionPreviewThumbnail(
      { uri: 'file:///tmp/input.mp4' },
      2500,
    );

    expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith('file:///tmp/input.mp4', {
      time: 2500,
    });
    expect(result).toBe('file:///tmp/thumb.jpg');
  });

  it('変換プレビュー生成が失敗したら null を返す', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    VideoThumbnails.getThumbnailAsync.mockRejectedValue(new Error('thumbnail failed'));
    const service = new VideoThumbnailService();

    await expect(
      service.getConversionPreviewThumbnail({ uri: 'file:///tmp/input.mp4' }, 2500),
    ).resolves.toBe(null);

    warnSpy.mockRestore();
  });
});
