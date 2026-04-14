import { renderHook, act } from '@testing-library/react-native';
import { usePilotEstimation } from '../usePilotEstimation';
import { IPilotEstimationUseCase } from '../../usecases/PilotEstimationUseCase';
import { VideoSource } from '../../types';

// ─── フィクスチャ ────────────────────────────────────────────────

const mockSource: VideoSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 10,
  width: 1280,
  height: 720,
  fileSizeBytes: 5_000_000,
};

function makeUseCase(bytesPerSec: number | null = 100_000): jest.Mocked<IPilotEstimationUseCase> {
  return {
    run: jest.fn().mockResolvedValue(bytesPerSec),
    estimateStartIndex: jest.fn().mockReturnValue(0),
  };
}

// ─── テストスイート ──────────────────────────────────────────────

describe('usePilotEstimation', () => {
  it('初期状態では bytesPerSec が null、isPilotDone が false', () => {
    const useCase = makeUseCase();
    // run を pending にする
    useCase.run.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePilotEstimation(mockSource, useCase));

    expect(result.current.bytesPerSec).toBeNull();
    expect(result.current.isPilotDone).toBe(false);
  });

  it('パイロット変換完了後に bytesPerSec が更新される', async () => {
    const useCase = makeUseCase(200_000);

    const { result } = renderHook(() => usePilotEstimation(mockSource, useCase));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.bytesPerSec).toBe(200_000);
    expect(result.current.isPilotDone).toBe(true);
  });

  it('パイロット変換が null を返すと bytesPerSec が null のまま isPilotDone が true になる', async () => {
    const useCase = makeUseCase(null);

    const { result } = renderHook(() => usePilotEstimation(mockSource, useCase));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.bytesPerSec).toBeNull();
    expect(result.current.isPilotDone).toBe(true);
  });

  it('マウント時に useCase.run が 1 回だけ呼ばれる', async () => {
    const useCase = makeUseCase();

    renderHook(() => usePilotEstimation(mockSource, useCase));

    await act(async () => {
      await Promise.resolve();
    });

    expect(useCase.run).toHaveBeenCalledTimes(1);
    expect(useCase.run).toHaveBeenCalledWith(mockSource, expect.any(AbortSignal));
  });

  it('アンマウント時に AbortController.abort が呼ばれる', async () => {
    const useCase = makeUseCase();
    // pending のまま保持
    let resolveRun!: (v: number | null) => void;
    useCase.run.mockReturnValue(
      new Promise((resolve) => {
        resolveRun = resolve;
      }),
    );

    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    const { unmount } = renderHook(() => usePilotEstimation(mockSource, useCase));

    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
    resolveRun(null);
  });

  it('useCase.run が予期せず throw しても isPilotDone が true になる', async () => {
    const useCase = makeUseCase();
    useCase.run.mockRejectedValue(new Error('unexpected'));

    const { result } = renderHook(() => usePilotEstimation(mockSource, useCase));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.bytesPerSec).toBeNull();
    expect(result.current.isPilotDone).toBe(true);
  });

  it('アンマウット後に run() が resolve されても state は更新されない', async () => {
    const useCase = makeUseCase();
    let resolveRun!: (v: number | null) => void;
    useCase.run.mockReturnValue(
      new Promise((resolve) => {
        resolveRun = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => usePilotEstimation(mockSource, useCase));

    unmount();

    await act(async () => {
      resolveRun(200_000);
      await Promise.resolve();
    });

    // アンマウット後なので state は初期値のまま
    expect(result.current.bytesPerSec).toBeNull();
    expect(result.current.isPilotDone).toBe(false);
  });
});
