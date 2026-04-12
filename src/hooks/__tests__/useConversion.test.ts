import { renderHook, act } from '@testing-library/react-native';
import { useConversion, UseConversionOptions } from '../useConversion';
import { IConversionUseCase } from '../../usecases/ConversionUseCase';
import { IMediaService } from '../../infrastructure/MediaService';
import { VideoSource, TrimRange, QualityPreset } from '../../types';

// ─── テスト用フィクスチャ ────────────────────────────────────────

const mockSource: VideoSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 30,
  width: 1920,
  height: 1080,
  fileSizeBytes: 5_000_000,
};

const mockRange: TrimRange = { startSec: 0, endSec: 30 };

const mockPreset: QualityPreset = { width: 620, fps: 15 };

function makeOptions(overrides: Partial<UseConversionOptions> = {}): UseConversionOptions {
  const mockUseCase: IConversionUseCase = {
    run: jest.fn().mockResolvedValue({
      ok: true,
      outputUri: 'file:///tmp/out.gif',
      sizeBytes: 1_000_000,
      preset: mockPreset,
    }),
  };
  const mockMedia: IMediaService = {
    saveToLibrary: jest.fn().mockResolvedValue(undefined),
    share: jest.fn().mockResolvedValue(undefined),
  };
  return {
    useCase: mockUseCase,
    media: mockMedia,
    outputSizeResolver: jest.fn().mockResolvedValue(1_000_000),
    ...overrides,
  };
}

// ─── テストスイート ──────────────────────────────────────────────

describe('useConversion', () => {
  it('初期状態では job が null', () => {
    const { result } = renderHook(() => useConversion(makeOptions()));
    expect(result.current.job).toBeNull();
  });

  it('start() を呼ぶと status が running になる', async () => {
    // useCase.run が非同期に完了するよう制御
    let resolveRun!: (v: unknown) => void;
    const runPromise = new Promise((resolve) => {
      resolveRun = resolve;
    });
    const options = makeOptions({
      useCase: { run: jest.fn().mockReturnValue(runPromise) },
    });

    const { result } = renderHook(() => useConversion(options));
    act(() => {
      result.current.start(mockSource, mockRange);
    });

    expect(result.current.job?.status).toBe('running');
    resolveRun({ ok: false, reason: 'cancelled', message: '' });
  });

  it('start() 完了後に status が done になる', async () => {
    const options = makeOptions();
    const { result } = renderHook(() => useConversion(options));

    await act(async () => {
      result.current.start(mockSource, mockRange);
    });

    expect(result.current.job?.status).toBe('done');
    expect(result.current.job?.outputUri).toBe('file:///tmp/out.gif');
  });

  it('cancel() を呼ぶと AbortSignal が発火する', async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveRun!: (v: unknown) => void;

    const options = makeOptions({
      useCase: {
        run: jest.fn().mockImplementation((_src, _trim, _onProgress, signal) => {
          capturedSignal = signal;
          return new Promise((resolve) => {
            resolveRun = resolve;
          });
        }),
      },
    });

    const { result } = renderHook(() => useConversion(options));
    act(() => {
      result.current.start(mockSource, mockRange);
    });
    act(() => {
      result.current.cancel();
    });

    expect(capturedSignal?.aborted).toBe(true);
    resolveRun({ ok: false, reason: 'cancelled', message: '' });
  });

  it('変換エラー時に status が error になる', async () => {
    const options = makeOptions({
      useCase: {
        run: jest.fn().mockResolvedValue({
          ok: false,
          reason: 'native_error',
          message: 'Something went wrong',
        }),
      },
    });

    const { result } = renderHook(() => useConversion(options));
    await act(async () => {
      result.current.start(mockSource, mockRange);
    });

    expect(result.current.job?.status).toBe('error');
  });
});
