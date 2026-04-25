import { renderHook } from '@testing-library/react-native';
import { useTrimPilot } from '../useTrimPilot';
import { VideoSource } from '../../types';

// ─── モック設定 ──────────────────────────────────────────────────

jest.mock('../../infrastructure/NativeGifService', () => ({
  NativeGifService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../usecases/PilotEstimationUseCase', () => ({
  PilotEstimationUseCase: jest.fn().mockImplementation(() => ({
    estimateStartIndex: jest.fn().mockReturnValue(2),
  })),
}));

// usePilotEstimation をモックして bytesPerSec / isPilotDone を直接制御する
let mockBytesPerSec: number | null = null;
let mockIsPilotDone = true;

jest.mock('../usePilotEstimation', () => ({
  usePilotEstimation: jest.fn().mockImplementation(() => ({
    get bytesPerSec() {
      return mockBytesPerSec;
    },
    get isPilotDone() {
      return mockIsPilotDone;
    },
  })),
}));

// ─── フィクスチャ ────────────────────────────────────────────────

const mockSource: VideoSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 10,
  width: 1280,
  height: 720,
  fileSizeBytes: 5_000_000,
};

// ─── テストスイート ──────────────────────────────────────────────

describe('useTrimPilot', () => {
  beforeEach(() => {
    mockBytesPerSec = null;
    mockIsPilotDone = true;
    jest.clearAllMocks();
    // モックを再セットアップ（clearAllMocks 後も動作するよう）
    const { PilotEstimationUseCase } = jest.requireMock(
      '../../usecases/PilotEstimationUseCase',
    ) as { PilotEstimationUseCase: jest.Mock };
    PilotEstimationUseCase.mockImplementation(() => ({
      estimateStartIndex: jest.fn().mockReturnValue(2),
    }));
    const { usePilotEstimation } = jest.requireMock('../usePilotEstimation') as {
      usePilotEstimation: jest.Mock;
    };
    usePilotEstimation.mockImplementation(() => ({
      get bytesPerSec() {
        return mockBytesPerSec;
      },
      get isPilotDone() {
        return mockIsPilotDone;
      },
    }));
  });

  describe('estimateStartIndex()', () => {
    it('bytesPerSec が null のとき undefined を返す', () => {
      mockBytesPerSec = null;
      const { result } = renderHook(() => useTrimPilot(mockSource));

      expect(result.current.estimateStartIndex(5, 10 * 1024 * 1024)).toBeUndefined();
    });

    it('bytesPerSec が有効値のとき number を返す', () => {
      mockBytesPerSec = 100_000;
      const { result } = renderHook(() => useTrimPilot(mockSource));

      const idx = result.current.estimateStartIndex(5, 10 * 1024 * 1024);
      expect(typeof idx).toBe('number');
    });

    it('pilotUseCase.estimateStartIndex が負値を返した場合は 0 にクランプされる', () => {
      mockBytesPerSec = 100_000;
      const { PilotEstimationUseCase } = jest.requireMock(
        '../../usecases/PilotEstimationUseCase',
      ) as { PilotEstimationUseCase: jest.Mock };
      PilotEstimationUseCase.mockImplementation(() => ({
        estimateStartIndex: jest.fn().mockReturnValue(-1),
      }));

      const { result } = renderHook(() => useTrimPilot(mockSource));

      const idx = result.current.estimateStartIndex(5, 10 * 1024 * 1024);
      expect(idx).toBe(0);
    });
  });

  describe('isPilotDone', () => {
    it('usePilotEstimation から isPilotDone が正しく伝播する（true）', () => {
      mockIsPilotDone = true;
      const { result } = renderHook(() => useTrimPilot(mockSource));

      expect(result.current.isPilotDone).toBe(true);
    });

    it('usePilotEstimation から isPilotDone が正しく伝播する（false）', () => {
      mockIsPilotDone = false;
      const { result } = renderHook(() => useTrimPilot(mockSource));

      expect(result.current.isPilotDone).toBe(false);
    });
  });
});
