import * as MediaLibraryModule from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { createVideoPlayer } from 'expo-video';
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

jest.mock('expo-video', () => ({
  createVideoPlayer: jest.fn().mockReturnValue({
    duration: 10,
    release: jest.fn(),
    addListener: jest
      .fn()
      .mockImplementation((_event: string, cb: (payload: { status: string }) => void) => {
        // 即座に readyToPlay を通知
        setTimeout(() => cb({ status: 'readyToPlay' }), 0);
        return { remove: jest.fn() };
      }),
  }),
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

describe('VideoImportService — importFileUri', () => {
  const fileUri = 'content://com.android.providers.media/video:12345';
  const filename = 'clip.mp4';
  const fileSize = 3_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    // importFileUri 用デフォルト: readyToPlay を即座に発火し duration=8 を返す
    jest.mocked(createVideoPlayer).mockReturnValue({
      duration: 8,
      release: jest.fn(),
      addListener: jest
        .fn()
        .mockImplementation((_event: string, cb: (payload: { status: string }) => void) => {
          setTimeout(() => cb({ status: 'readyToPlay' }), 0);
          return { remove: jest.fn() };
        }),
    } as never);
    ExpoFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
    ExpoFileSystem.copyAsync.mockResolvedValue(undefined);
    ExpoFileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: fileSize });
  });

  it('ファイル URI をキャッシュへコピーして VideoSource を返す', async () => {
    const service = new VideoImportService();
    const source = await service.importFileUri(fileUri, filename, fileSize);

    expect(ExpoFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      'file:///mock/cache/selected-videos/',
      { intermediates: true },
    );
    expect(ExpoFileSystem.copyAsync).toHaveBeenCalledWith({
      from: fileUri,
      to: expect.stringMatching(/^file:\/\/\/mock\/cache\/selected-videos\//),
    });
    expect(source).toMatchObject({
      durationSec: 8,
      width: 1920,
      height: 1080,
      fileSizeBytes: fileSize,
    });
    expect(source.uri).toMatch(/^file:\/\/\/mock\/cache\/selected-videos\//);
  });

  it('getInfoAsync が exists=false の場合は fileSize 引数をフォールバックに使う', async () => {
    ExpoFileSystem.getInfoAsync.mockResolvedValue({ exists: false, size: null });
    const service = new VideoImportService();
    const source = await service.importFileUri(fileUri, filename, fileSize);

    expect(source.fileSizeBytes).toBe(fileSize);
  });

  it('拡張子なしファイル名には .mp4 を補完する', async () => {
    const service = new VideoImportService();
    const source = await service.importFileUri(fileUri, 'noextension', fileSize);

    expect(source.uri).toMatch(/\.mp4$/);
  });

  it('スラッシュを含むファイル名はバス名から拡張子を抽出する', async () => {
    const service = new VideoImportService();
    const source = await service.importFileUri(fileUri, 'video/path/file.MOV', fileSize);

    expect(source.uri).toMatch(/\.MOV$/);
  });

  it('不正な拡張子（ドットと英数字以外）は .mp4 にフォールバックする', async () => {
    const service = new VideoImportService();
    const source = await service.importFileUri(fileUri, 'test.../evil', fileSize);

    expect(source.uri).toMatch(/\.mp4$/);
  });

  it('statusChange で error が発火された場合は durationSec=0 を返す', async () => {
    jest.mocked(createVideoPlayer).mockReturnValue({
      duration: 0,
      release: jest.fn(),
      addListener: jest
        .fn()
        .mockImplementation((_event: string, cb: (payload: { status: string }) => void) => {
          setTimeout(() => cb({ status: 'error' }), 0);
          return { remove: jest.fn() };
        }),
    } as never);
    const service = new VideoImportService();
    const source = await service.importFileUri(fileUri, filename, fileSize);

    expect(source.durationSec).toBe(0);
  });
});
