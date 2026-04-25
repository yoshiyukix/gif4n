import { ConversionUseCase } from '../ConversionUseCase';
import { SizeEstimator } from '../SizeEstimator';
import { INativeGifService } from '../../infrastructure/NativeGifService';
import { VideoSource, TrimRange, QualityPreset, QUALITY_PRESETS } from '../../types';

// ────────────────────────────────────────────────
// テスト用ヘルパー
// ────────────────────────────────────────────────

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function makeSource(overrides: Partial<VideoSource> = {}): VideoSource {
  return {
    uri: 'file:///tmp/test.mp4',
    durationSec: 10,
    width: 1280,
    height: 720,
    fileSizeBytes: 5 * 1024 * 1024,
    ...overrides,
  };
}

function makeTrim(startSec = 0, endSec = 10): TrimRange {
  return { startSec, endSec };
}

/** 指定サイズの GIF を返すモック NativeGifService */
function makeNativeMock(outputSizeBytes: number): jest.Mocked<INativeGifService> {
  return {
    convert: jest
      .fn()
      .mockImplementation(
        async (
          _source: VideoSource,
          _trim: TrimRange,
          _preset: QualityPreset,
          onProgress: (rate: number) => void,
          signal: AbortSignal,
        ): Promise<string> => {
          if (signal.aborted) throw new Error('cancelled');
          onProgress(0.5);
          onProgress(1.0);
          return `file:///tmp/out_${outputSizeBytes}.gif`;
        },
      ),
    convertPilot: jest.fn().mockResolvedValue(100_000),
  };
}

/** キャンセルをシミュレートするモック */
function makeCancelMock(): jest.Mocked<INativeGifService> {
  return {
    convert: jest
      .fn()
      .mockImplementation(
        async (
          _source: VideoSource,
          _trim: TrimRange,
          _preset: QualityPreset,
          _onProgress: (rate: number) => void,
          signal: AbortSignal,
        ): Promise<string> => {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (signal.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
          return 'file:///tmp/out.gif';
        },
      ),
    convertPilot: jest.fn().mockResolvedValue(100_000),
  };
}

/** ネイティブエラーをシミュレートするモック */
function makeErrorMock(message: string): jest.Mocked<INativeGifService> {
  return {
    convert: jest.fn().mockRejectedValue(new Error(message)),
    convertPilot: jest.fn().mockResolvedValue(100_000),
  };
}

// ────────────────────────────────────────────────
// テストスイート
// ────────────────────────────────────────────────

describe('ConversionUseCase', () => {
  const source = makeSource();
  const trim = makeTrim();
  const noop = () => {};

  // ────────────────────────────
  // 正常系: 最初の preset で成功
  // ────────────────────────────

  describe('正常系', () => {
    it('最初の preset が 10MB 以内なら ok: true を返す', async () => {
      const sizeBytes = 5 * 1024 * 1024; // 5 MB
      const mock = makeNativeMock(sizeBytes);
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => sizeBytes,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.sizeBytes).toBe(sizeBytes);
        expect(result.outputUri).toMatch(/\.gif$/);
        expect(result.preset).toEqual(QUALITY_PRESETS[0]);
      }
    });

    it('convert が 1 回だけ呼ばれている', async () => {
      const sizeBytes = 5 * 1024 * 1024;
      const mock = makeNativeMock(sizeBytes);
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => sizeBytes,
      });

      expect(mock.convert).toHaveBeenCalledTimes(1);
    });

    it('onProgress コールバックが呼ばれる', async () => {
      const sizeBytes = 5 * 1024 * 1024;
      const mock = makeNativeMock(sizeBytes);
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();
      const progressValues: number[] = [];

      await useCase.run(source, trim, {
        onProgress: (r) => progressValues.push(r),
        signal: controller.signal,
        outputSizeResolver: () => sizeBytes,
      });

      expect(progressValues.length).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────
  // 再試行: サイズ超過
  // ────────────────────────────

  describe('再試行', () => {
    it('出力が 10MB 超なら次の preset で再試行する', async () => {
      let callCount = 0;
      const mock: jest.Mocked<INativeGifService> = {
        convert: jest
          .fn()
          .mockImplementation(
            async (
              _source: VideoSource,
              _trim: TrimRange,
              _preset: QualityPreset,
              onProgress: (rate: number) => void,
              signal: AbortSignal,
            ): Promise<string> => {
              if (signal.aborted) throw new Error('cancelled');
              onProgress(1.0);
              callCount++;
              // 2 回目以降は 5MB（成功）
              const size = callCount === 1 ? MAX_SIZE + 1 : 5 * 1024 * 1024;
              return `file:///tmp/out_${size}.gif`;
            },
          ),
        convertPilot: jest.fn().mockResolvedValue(100_000),
      };
      // 変換後にサイズを取得するため、ConversionUseCase がサイズを計算できるよう
      // モックの outputUri からサイズを解釈するかどうかは実装次第。
      // ここでは「変換後サイズが 10MB 超→再試行」のロジックを SizeResolver 経由でテスト
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        // outputSizeResolver: 変換結果 URI → sizeBytes を返すモック関数
        outputSizeResolver: (uri: string) => {
          if (uri.includes(`${MAX_SIZE + 1}`)) return MAX_SIZE + 1;
          return 5 * 1024 * 1024;
        },
      });

      expect(result.ok).toBe(true);
      expect(mock.convert).toHaveBeenCalledTimes(2);
      if (result.ok) {
        expect(result.preset).toEqual(QUALITY_PRESETS[1]); // 2 番目の preset
      }
    });

    it('全 6 preset でも 10MB 超なら too_large を返す', async () => {
      const mock = makeNativeMock(MAX_SIZE + 1); // 常に 10MB 超
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => MAX_SIZE + 1, // 常に 10MB 超
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('too_large');
      }
      expect(mock.convert).toHaveBeenCalledTimes(6);
    });
  });

  // ────────────────────────────
  // maxSizeBytes カスタム上限
  // ────────────────────────────

  describe('maxSizeBytes カスタム上限', () => {
    it('maxSizeBytes=5MB を指定すると 5MB 超で再試行する', async () => {
      const LIMIT = 5 * 1024 * 1024;
      const mock = makeNativeMock(LIMIT + 1);
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      // 最初は 5MB 超、2 回目から LIMIT 以内
      let callCount = 0;
      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: (_uri) => {
          callCount++;
          return callCount === 1 ? LIMIT + 1 : LIMIT - 1;
        },
        maxSizeBytes: LIMIT,
      });

      expect(result.ok).toBe(true);
      expect(mock.convert).toHaveBeenCalledTimes(2);
    });

    it('maxSizeBytes が省略されたとき 10MB がデフォルト上限になる', async () => {
      const sizeBytes = 5 * 1024 * 1024;
      const mock = makeNativeMock(sizeBytes);
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => sizeBytes,
      });

      expect(result.ok).toBe(true);
    });

    it('too_large メッセージに上限 MB が含まれる', async () => {
      const LIMIT = 5 * 1024 * 1024;
      const mock = makeNativeMock(LIMIT + 1);
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => LIMIT + 1,
        maxSizeBytes: LIMIT,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('too_large');
        expect(result.message).toContain('5MB');
      }
    });
  });

  // ────────────────────────────
  // キャンセル
  // ────────────────────────────

  describe('キャンセル', () => {
    it('AbortSignal 発火で cancelled を返す', async () => {
      const mock = makeCancelMock();
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();
      controller.abort();

      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => 0,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('cancelled');
      }
    });
  });

  // ────────────────────────────
  // ネイティブエラー
  // ────────────────────────────

  describe('ネイティブエラー', () => {
    it('convert が例外を投げたら native_error を返す', async () => {
      const mock = makeErrorMock('ネイティブモジュールエラー');
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      const result = await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => 0,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('native_error');
        expect(result.message).toContain('ネイティブモジュールエラー');
      }
    });
  });

  // ────────────────────────────
  // SizeEstimator 連携
  // ────────────────────────────

  describe('SizeEstimator 連携', () => {
    it('estimateStartIndex が返すインデックスから試行を開始する', async () => {
      const mockEstimator = {
        estimateStartIndex: jest.fn().mockReturnValue(3),
        estimateBytes: jest.fn(),
      };
      const mock = makeNativeMock(5 * 1024 * 1024);
      const useCase = new ConversionUseCase(mock, mockEstimator as unknown as SizeEstimator);
      const controller = new AbortController();

      await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => 5 * 1024 * 1024,
      });

      expect(mockEstimator.estimateStartIndex).toHaveBeenCalledWith(source, trim, 10 * 1024 * 1024);
      // convert の最初の呼び出しが QUALITY_PRESETS[3] で行われるはず
      expect(mock.convert).toHaveBeenCalledWith(
        source,
        trim,
        QUALITY_PRESETS[3],
        expect.any(Function),
        expect.any(AbortSignal),
      );
    });
  });

  // ────────────────────────────
  // startIndexOverride
  // ────────────────────────────

  describe('startIndexOverride', () => {
    it('startIndexOverride を指定すると estimateStartIndex が呼ばれない', async () => {
      const mockEstimator = {
        estimateStartIndex: jest.fn().mockReturnValue(0),
        estimateBytes: jest.fn(),
      };
      const mock = makeNativeMock(5 * 1024 * 1024);
      const useCase = new ConversionUseCase(mock, mockEstimator as unknown as SizeEstimator);
      const controller = new AbortController();

      await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => 5 * 1024 * 1024,
        startIndexOverride: 4,
      });

      expect(mockEstimator.estimateStartIndex).not.toHaveBeenCalled();
    });

    it('startIndexOverride で指定したインデックスから試行を開始する', async () => {
      const mock = makeNativeMock(5 * 1024 * 1024);
      const useCase = new ConversionUseCase(mock, new SizeEstimator());
      const controller = new AbortController();

      await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => 5 * 1024 * 1024,
        startIndexOverride: 2,
      });

      expect(mock.convert).toHaveBeenCalledWith(
        source,
        trim,
        QUALITY_PRESETS[2],
        expect.any(Function),
        expect.any(AbortSignal),
      );
    });

    it('startIndexOverride が undefined のときは SizeEstimator にフォールバックする', async () => {
      const mockEstimator = {
        estimateStartIndex: jest.fn().mockReturnValue(1),
        estimateBytes: jest.fn(),
      };
      const mock = makeNativeMock(5 * 1024 * 1024);
      const useCase = new ConversionUseCase(mock, mockEstimator as unknown as SizeEstimator);
      const controller = new AbortController();

      await useCase.run(source, trim, {
        onProgress: noop,
        signal: controller.signal,
        outputSizeResolver: () => 5 * 1024 * 1024,
      });

      expect(mockEstimator.estimateStartIndex).toHaveBeenCalledWith(source, trim, 10 * 1024 * 1024);
    });
  });
});
