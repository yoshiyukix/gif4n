import * as MediaLibraryModule from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoImportService } from '../VideoImportService';

jest.mock('expo-media-library', () => ({
  getAssetInfoAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///mock/cache/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

const MediaLibrary = jest.mocked(
  MediaLibraryModule as unknown as {
    getAssetInfoAsync: jest.Mock;
  },
);

const ExpoFileSystem = jest.mocked(
  FileSystem as unknown as {
    cacheDirectory: string;
    makeDirectoryAsync: jest.Mock;
    copyAsync: jest.Mock;
    getInfoAsync: jest.Mock;
  },
);

describe('VideoImportService', () => {
  const asset = {
    id: 'asset-1',
    filename: 'IMG_1648.MP4',
    duration: 12.34,
    width: 1920,
    height: 1080,
    uri: 'ph://asset-uri',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({
      localUri: 'file:///var/mobile/Media/DCIM/101APPLE/IMG_1648.MP4',
    });
    ExpoFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
    ExpoFileSystem.copyAsync.mockResolvedValue(undefined);
    ExpoFileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 5_432_100 });
  });

  it('選択した動画をキャッシュへコピーして VideoSource を返す', async () => {
    const service = new VideoImportService();

    const source = await service.importAsset(asset as never);

    expect(ExpoFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      'file:///mock/cache/selected-videos/',
      { intermediates: true },
    );
    expect(ExpoFileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///var/mobile/Media/DCIM/101APPLE/IMG_1648.MP4',
      to: expect.stringMatching(/^file:\/\/\/mock\/cache\/selected-videos\/[a-z0-9]+\.MP4$/),
    });
    expect(source).toEqual({
      uri: expect.stringMatching(/^file:\/\/\/mock\/cache\/selected-videos\/[a-z0-9]+\.MP4$/),
      durationSec: 12.34,
      width: 1920,
      height: 1080,
      fileSizeBytes: 5_432_100,
    });
  });

  it('localUri がない場合は asset.uri をコピー元に使う', async () => {
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({ localUri: undefined });
    const service = new VideoImportService();

    await service.importAsset(asset as never);

    expect(ExpoFileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'ph://asset-uri',
      to: expect.any(String),
    });
  });

  it('コピー後のサイズ取得に失敗した場合は fileSizeBytes を 0 にする', async () => {
    ExpoFileSystem.getInfoAsync.mockResolvedValue({ exists: false, size: null });
    const service = new VideoImportService();

    const source = await service.importAsset(asset as never);

    expect(source.fileSizeBytes).toBe(0);
  });

  it('asset.id にスラッシュが含まれても保存先 URI に階層が混入しない', async () => {
    const service = new VideoImportService();

    const source = await service.importAsset({
      ...asset,
      id: 'CA9E6F9A-9256-4D1E-BECC-2700F115F020/L0/001',
    } as never);

    expect(source.uri).toMatch(/^file:\/\/\/mock\/cache\/selected-videos\//);
    expect(source.uri.replace('file:///mock/cache/selected-videos/', '')).not.toContain('/');
  });

  it('localUri に hash fragment が含まれる場合は除去して copyAsync に渡す', async () => {
    MediaLibrary.getAssetInfoAsync.mockResolvedValue({
      localUri:
        'file:///var/mobile/Media/DCIM/101APPLE/IMG_1648.MP4#YnBsaXN0MDDRAQJfEBtSZWNvbW1lbmRlZA==',
    });
    const service = new VideoImportService();

    await service.importAsset(asset as never);

    expect(ExpoFileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///var/mobile/Media/DCIM/101APPLE/IMG_1648.MP4',
      to: expect.any(String),
    });
  });
});
