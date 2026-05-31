import { renderHook, act } from '@testing-library/react-native';
import { useConversionSession, type ConversionSessionDependencies } from '../useConversionSession';
import { VideoSource, TrimRange } from '../../types';

const mockSource: VideoSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 10,
  width: 1280,
  height: 720,
  fileSizeBytes: 5_000_000,
};

const mockTrimRange: TrimRange = { startSec: 0, endSec: 5 };
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function makeDependencies(): {
  dependencies: ConversionSessionDependencies;
  mockPilotRun: jest.Mock;
  mockPilotEstimateStartIndex: jest.Mock;
  mockConversionRun: jest.Mock;
} {
  const mockPilotRun = jest.fn().mockResolvedValue(200_000);
  const mockPilotEstimateStartIndex = jest.fn().mockReturnValue(1);
  const mockConversionRun = jest.fn().mockResolvedValue({
    ok: true,
    outputUri: 'file:///tmp/out.gif',
    sizeBytes: 800_000,
    preset: { width: 620, fps: 15 },
  });

  return {
    mockPilotRun,
    mockPilotEstimateStartIndex,
    mockConversionRun,
    dependencies: {
      pilotUseCase: {
        run: mockPilotRun,
        estimateStartIndex: mockPilotEstimateStartIndex,
      },
      conversionUseCase: {
        run: mockConversionRun,
      },
      outputSizeResolver: jest.fn().mockResolvedValue(500_000),
    },
  };
}

describe('useConversionSession', () => {
  it('初期状態では job が null', () => {
    const { dependencies } = makeDependencies();
    const { result } = renderHook(() =>
      useConversionSession({ maxSizeBytes: MAX_SIZE_BYTES, dependencies }),
    );

    expect(result.current.job).toBeNull();
  });

  it('start 呼び出し直後に job.status が "piloting" になる', () => {
    const { dependencies, mockPilotRun } = makeDependencies();
    mockPilotRun.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useConversionSession({ maxSizeBytes: MAX_SIZE_BYTES, dependencies }),
    );

    act(() => {
      result.current.start(mockSource, mockTrimRange);
    });

    expect(result.current.job?.status).toBe('piloting');
  });

  it('パイロット完了後に job.status が "running" になる', async () => {
    const { dependencies, mockConversionRun } = makeDependencies();
    mockConversionRun.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useConversionSession({ maxSizeBytes: MAX_SIZE_BYTES, dependencies }),
    );

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('running');
  });

  it('変換完了後に job.status が "done" になる', async () => {
    const { dependencies } = makeDependencies();
    const { result } = renderHook(() =>
      useConversionSession({ maxSizeBytes: MAX_SIZE_BYTES, dependencies }),
    );

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('done');
    expect(result.current.job?.outputUri).toBe('file:///tmp/out.gif');
  });

  it('パイロット失敗（null）時は startIndexOverride なしで変換が続行される', async () => {
    const { dependencies, mockPilotRun, mockConversionRun } = makeDependencies();
    mockPilotRun.mockResolvedValue(null);
    mockConversionRun.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useConversionSession({ maxSizeBytes: MAX_SIZE_BYTES, dependencies }),
    );

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('running');
    expect(mockConversionRun).toHaveBeenCalledWith(
      mockSource,
      mockTrimRange,
      expect.objectContaining({ startIndexOverride: undefined }),
    );
  });

  it('cancel() 呼び出しでパイロット中でも job.status が "cancelled" になる', async () => {
    const { dependencies, mockPilotRun } = makeDependencies();
    let abortSignal: AbortSignal | undefined;

    mockPilotRun.mockImplementation(
      (_source: VideoSource, signal: AbortSignal) =>
        new Promise<number | null>((resolve) => {
          abortSignal = signal;
          signal.addEventListener('abort', () => resolve(null));
        }),
    );

    const { result } = renderHook(() =>
      useConversionSession({ maxSizeBytes: MAX_SIZE_BYTES, dependencies }),
    );

    act(() => {
      result.current.start(mockSource, mockTrimRange);
    });

    await act(async () => {
      result.current.cancel();
      expect(abortSignal?.aborted).toBe(true);
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('cancelled');
  });

  it('変換エラー時に job.status が "error" になる', async () => {
    const { dependencies, mockConversionRun } = makeDependencies();
    mockConversionRun.mockResolvedValue({
      ok: false,
      reason: 'too_large',
      message: '全品質設定でサイズ超過',
    });

    const { result } = renderHook(() =>
      useConversionSession({ maxSizeBytes: MAX_SIZE_BYTES, dependencies }),
    );

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('error');
    expect(result.current.job?.errorReason).toBe('too_large');
  });
});
