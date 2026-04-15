import * as ExpoModulesCore from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeGifService } from '../NativeGifService';
import { VideoSource, TrimRange, QualityPreset } from '../../types';

// ─── expo-modules-core のモック ───────────────────────────────────

jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

const { requireNativeModule } = jest.mocked(ExpoModulesCore);
const mockGetInfoAsync = jest.mocked(FileSystem.getInfoAsync);
const mockDeleteAsync = jest.mocked(FileSystem.deleteAsync);

// ─── テスト用ヘルパー ─────────────────────────────────────────────

function makeSource(): VideoSource {
  return {
    uri: 'file:///tmp/test.mp4',
    durationSec: 5,
    width: 1280,
    height: 720,
    fileSizeBytes: 2 * 1024 * 1024,
  };
}

function makeTrim(): TrimRange {
  return { startSec: 0, endSec: 5 };
}

function makePreset(): QualityPreset {
  return { width: 620, fps: 15 };
}

// ─── テストスイート ──────────────────────────────────────────────

describe('NativeGifService', () => {
  let mockNativeModule: {
    convertToGif: jest.Mock;
    cancelConversion: jest.Mock;
    addListener: jest.Mock;
    removeListeners: jest.Mock;
  };

  beforeEach(() => {
    mockNativeModule = {
      convertToGif: jest.fn().mockResolvedValue('file:///tmp/out.gif'),
      cancelConversion: jest.fn().mockResolvedValue(undefined),
      addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
      removeListeners: jest.fn(),
    };
    requireNativeModule.mockReturnValue(mockNativeModule);
    mockGetInfoAsync.mockResolvedValue({
      exists: true,
      uri: 'file:///tmp/out.gif',
      size: 50000,
      isDirectory: false,
      modificationTime: 0,
    });
    mockDeleteAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convert', () => {
    it('convertToGif を正しいパラメーターで呼び出す', async () => {
      const service = new NativeGifService();
      const source = makeSource();
      const trim = makeTrim();
      const preset = makePreset();
      const controller = new AbortController();

      await service.convert(source, trim, preset, () => {}, controller.signal);

      expect(mockNativeModule.convertToGif).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: source.uri,
          startSec: trim.startSec,
          endSec: trim.endSec,
          outputWidth: preset.width,
          fps: preset.fps,
        }),
      );
    });

    it('convertToGif が返した URI をそのまま返す', async () => {
      const service = new NativeGifService();
      const controller = new AbortController();

      const result = await service.convert(
        makeSource(),
        makeTrim(),
        makePreset(),
        () => {},
        controller.signal,
      );

      expect(result).toBe('file:///tmp/out.gif');
    });

    it('addListener が "onProgress" で登録される', async () => {
      const service = new NativeGifService();
      const controller = new AbortController();

      await service.convert(makeSource(), makeTrim(), makePreset(), () => {}, controller.signal);

      expect(mockNativeModule.addListener).toHaveBeenCalledWith('onProgress', expect.any(Function));
    });

    it('変換完了後に subscription.remove が呼ばれる', async () => {
      const removeFn = jest.fn();
      mockNativeModule.addListener.mockReturnValue({ remove: removeFn });
      const service = new NativeGifService();
      const controller = new AbortController();

      await service.convert(makeSource(), makeTrim(), makePreset(), () => {}, controller.signal);

      expect(removeFn).toHaveBeenCalled();
    });

    it('AbortSignal が事前に発火していたら AbortError を投げる', async () => {
      const service = new NativeGifService();
      const controller = new AbortController();
      controller.abort();

      await expect(
        service.convert(makeSource(), makeTrim(), makePreset(), () => {}, controller.signal),
      ).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('convertToGif が失敗したら例外を伝播する', async () => {
      mockNativeModule.convertToGif.mockRejectedValue(new Error('native error'));
      const service = new NativeGifService();
      const controller = new AbortController();

      await expect(
        service.convert(makeSource(), makeTrim(), makePreset(), () => {}, controller.signal),
      ).rejects.toThrow('native error');
    });
  });

  describe('convertPilot', () => {
    it('25%・50%・75% 地点で各 1 秒を中間品質プリセット (480px/10fps) で変換する', async () => {
      const service = new NativeGifService();
      const source = makeSource(); // durationSec: 5
      const controller = new AbortController();

      await service.convertPilot(source, controller.signal);

      // actualDuration = min(1.0, 5) = 1.0
      // pos=0.25: center=1.25, start=max(0, min(0.75, 4.0))=0.75, end=1.75
      // pos=0.50: center=2.50, start=max(0, min(2.00, 4.0))=2.00, end=3.00
      // pos=0.75: center=3.75, start=max(0, min(3.25, 4.0))=3.25, end=4.25
      // 中間品質 QUALITY_PRESETS[4] = { width: 480, fps: 10 }
      expect(mockNativeModule.convertToGif).toHaveBeenCalledTimes(3);
      expect(mockNativeModule.convertToGif).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          uri: source.uri,
          startSec: 0.75,
          endSec: 1.75,
          outputWidth: 480,
          fps: 10,
        }),
      );
      expect(mockNativeModule.convertToGif).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          uri: source.uri,
          startSec: 2.0,
          endSec: 3.0,
          outputWidth: 480,
          fps: 10,
        }),
      );
      expect(mockNativeModule.convertToGif).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          uri: source.uri,
          startSec: 3.25,
          endSec: 4.25,
          outputWidth: 480,
          fps: 10,
        }),
      );
    });

    it('3サンプルの bytes/sec 平均を返す', async () => {
      const service = new NativeGifService();
      const controller = new AbortController();
      // getInfoAsync は各サンプルで 50000 bytes を返す（beforeEach でセット済み）
      // 各サンプル: 50000 bytes / 1.0 sec = 50000 bytes/sec → 平均 = 50000

      const result = await service.convertPilot(makeSource(), controller.signal);

      expect(result).toBe(50000);
    });

    it('各サンプルの一時ファイルを削除する', async () => {
      const service = new NativeGifService();
      const controller = new AbortController();

      await service.convertPilot(makeSource(), controller.signal);

      expect(mockDeleteAsync).toHaveBeenCalledTimes(3);
      expect(mockDeleteAsync).toHaveBeenCalledWith('file:///tmp/out.gif', { idempotent: true });
    });

    it('ファイルが存在しない場合は 0 を返す', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: false,
        uri: 'file:///tmp/out.gif',
        isDirectory: false,
      });
      const service = new NativeGifService();
      const controller = new AbortController();

      const result = await service.convertPilot(makeSource(), controller.signal);

      expect(result).toBe(0);
    });

    it('AbortSignal で中断されると AbortError を投げる', async () => {
      const service = new NativeGifService();
      const controller = new AbortController();
      controller.abort();

      await expect(service.convertPilot(makeSource(), controller.signal)).rejects.toMatchObject({
        name: 'AbortError',
      });
    });

    it('動画が 1 秒未満の場合は全サンプルで全体を対象とする', async () => {
      const service = new NativeGifService();
      const shortSource: VideoSource = { ...makeSource(), durationSec: 0.5 };
      const controller = new AbortController();

      await service.convertPilot(shortSource, controller.signal);

      // actualDuration = min(1.0, 0.5) = 0.5
      // 0.5秒動画では全 position で startSec=0, endSec=0.5 になる
      expect(mockNativeModule.convertToGif).toHaveBeenCalledTimes(3);
      expect(mockNativeModule.convertToGif).toHaveBeenCalledWith(
        expect.objectContaining({
          startSec: 0,
          endSec: 0.5,
        }),
      );
    });

    it('動画長が 0 秒以下の場合はネイティブ変換せず 0 を返す', async () => {
      const service = new NativeGifService();
      const zeroSource: VideoSource = { ...makeSource(), durationSec: 0 };
      const controller = new AbortController();

      const result = await service.convertPilot(zeroSource, controller.signal);

      expect(result).toBe(0);
      expect(mockNativeModule.convertToGif).not.toHaveBeenCalled();
    });

    it('deleteAsync が失敗しても bytes/sec の平均は返す', async () => {
      mockDeleteAsync.mockRejectedValue(new Error('delete failed'));
      const service = new NativeGifService();
      const controller = new AbortController();

      const result = await service.convertPilot(makeSource(), controller.signal);

      expect(result).toBe(50000);
    });

    it('getInfoAsync が失敗した場合は 0 を返す', async () => {
      mockGetInfoAsync.mockRejectedValue(new Error('stat failed'));
      const service = new NativeGifService();
      const controller = new AbortController();

      const result = await service.convertPilot(makeSource(), controller.signal);

      expect(result).toBe(0);
    });
  });
});
