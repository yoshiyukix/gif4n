import { renderHook, act } from '@testing-library/react-native';
import { useConversionProcess } from '../useConversionProcess';
import { VideoSource, TrimRange } from '../../types';

// ─── モック設定 ──────────────────────────────────────────────────

jest.mock('../../infrastructure/NativeGifService', () => ({
  NativeGifService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../usecases/SizeEstimator', () => ({
  SizeEstimator: jest.fn().mockImplementation(() => ({})),
}));

let mockPilotRun: jest.Mock;
let mockPilotEstimateStartIndex: jest.Mock;
jest.mock('../../usecases/PilotEstimationUseCase', () => ({
  PilotEstimationUseCase: jest.fn().mockImplementation(() => ({
    get run() {
      return mockPilotRun;
    },
    get estimateStartIndex() {
      return mockPilotEstimateStartIndex;
    },
  })),
}));

let mockConversionRun: jest.Mock;
jest.mock('../../usecases/ConversionUseCase', () => ({
  ConversionUseCase: jest.fn().mockImplementation(() => ({
    get run() {
      return mockConversionRun;
    },
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 500_000 }),
}));

// ─── フィクスチャ ────────────────────────────────────────────────

const mockSource: VideoSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 10,
  width: 1280,
  height: 720,
  fileSizeBytes: 5_000_000,
};

const mockTrimRange: TrimRange = { startSec: 0, endSec: 5 };

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// ─── テストスイート ──────────────────────────────────────────────

describe('useConversionProcess', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPilotRun = jest.fn().mockResolvedValue(200_000);
    mockPilotEstimateStartIndex = jest.fn().mockReturnValue(1);

    // PilotEstimationUseCase インスタンスにメソッドを正しくバインド
    const { PilotEstimationUseCase } = jest.requireMock(
      '../../usecases/PilotEstimationUseCase',
    ) as { PilotEstimationUseCase: jest.Mock };
    PilotEstimationUseCase.mockImplementation(() => ({
      run: mockPilotRun,
      estimateStartIndex: mockPilotEstimateStartIndex,
    }));

    mockConversionRun = jest.fn().mockResolvedValue({
      ok: true,
      outputUri: 'file:///tmp/out.gif',
      sizeBytes: 800_000,
      preset: { width: 620, fps: 15 },
    });

    const { ConversionUseCase } = jest.requireMock('../../usecases/ConversionUseCase') as {
      ConversionUseCase: jest.Mock;
    };
    ConversionUseCase.mockImplementation(() => ({
      run: mockConversionRun,
    }));
  });

  it('初期状態では job が null', () => {
    const { result } = renderHook(() => useConversionProcess(MAX_SIZE_BYTES));

    expect(result.current.job).toBeNull();
  });

  it('start 呼び出し直後に job.status が "piloting" になる', () => {
    // pilot を pending にする
    mockPilotRun.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useConversionProcess(MAX_SIZE_BYTES));

    act(() => {
      result.current.start(mockSource, mockTrimRange);
    });

    expect(result.current.job?.status).toBe('piloting');
  });

  it('パイロット完了後に job.status が "running" になる', async () => {
    // conversion を pending にする
    mockConversionRun.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useConversionProcess(MAX_SIZE_BYTES));

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('running');
  });

  it('変換完了後に job.status が "done" になる', async () => {
    const { result } = renderHook(() => useConversionProcess(MAX_SIZE_BYTES));

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('done');
    expect(result.current.job?.outputUri).toBe('file:///tmp/out.gif');
  });

  it('パイロット失敗（null）時は startIndexOverride なしで変換が続行される', async () => {
    mockPilotRun.mockResolvedValue(null);
    mockConversionRun.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useConversionProcess(MAX_SIZE_BYTES));

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('running');
    // startIndexOverride は undefined のはず（フォールバック）
    expect(mockConversionRun).toHaveBeenCalledWith(
      mockSource,
      mockTrimRange,
      expect.objectContaining({ startIndexOverride: undefined }),
    );
  });

  it('cancel() 呼び出しでパイロット中でも job.status が "cancelled" になる', async () => {
    let abortSignal: AbortSignal | undefined;
    mockPilotRun.mockImplementation(
      (_source: VideoSource, signal: AbortSignal) =>
        new Promise<number | null>((resolve) => {
          abortSignal = signal;
          // abort シグナルが発火したら null で解決（PilotEstimationUseCase の挙動を模倣）
          signal.addEventListener('abort', () => resolve(null));
        }),
    );

    const { result } = renderHook(() => useConversionProcess(MAX_SIZE_BYTES));

    act(() => {
      result.current.start(mockSource, mockTrimRange);
    });

    expect(result.current.job?.status).toBe('piloting');

    await act(async () => {
      result.current.cancel();
      expect(abortSignal?.aborted).toBe(true);
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('cancelled');
  });

  it('変換エラー時に job.status が "error" になる', async () => {
    mockConversionRun.mockResolvedValue({
      ok: false,
      reason: 'too_large',
      message: '全品質設定でサイズ超過',
    });

    const { result } = renderHook(() => useConversionProcess(MAX_SIZE_BYTES));

    await act(async () => {
      result.current.start(mockSource, mockTrimRange);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.job?.status).toBe('error');
    expect(result.current.job?.errorReason).toBe('too_large');
  });
});
