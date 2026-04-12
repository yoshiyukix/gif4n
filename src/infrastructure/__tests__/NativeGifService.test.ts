import * as ExpoModulesCore from 'expo-modules-core';
import { NativeGifService } from '../NativeGifService';
import { VideoSource, TrimRange, QualityPreset } from '../../types';

// ─── expo-modules-core のモック ───────────────────────────────────

jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(),
}));

const { requireNativeModule } = jest.mocked(ExpoModulesCore);

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
});
