import { renderHook, act } from '@testing-library/react-native';
import { useMediaActions } from '../useMediaActions';

// ─── モック ──────────────────────────────────────────────────────

const mockSaveToLibrary = jest.fn();
const mockShare = jest.fn();

jest.mock('../../infrastructure/MediaService', () => ({
  MediaService: jest.fn().mockImplementation(() => ({
    saveToLibrary: mockSaveToLibrary,
    share: mockShare,
  })),
}));

const mockAddGifEntry = jest.fn();
jest.mock('../../infrastructure/GifLibraryStore', () => ({
  addGifEntry: (...args: unknown[]) => mockAddGifEntry(...args),
}));

// ─── フィクスチャ ────────────────────────────────────────────────

const GIF_URI = 'file:///tmp/out.gif';
const SIZE_BYTES = 1_000_000;
const PRESET = { width: 620, fps: 15 } as const;

// ─── テストスイート ──────────────────────────────────────────────

describe('useMediaActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveToLibrary.mockResolvedValue('asset-001');
    mockAddGifEntry.mockResolvedValue(undefined);
    mockShare.mockResolvedValue(undefined);
  });

  // ─── saveGif ────────────────────────────────────────────────────

  describe('saveGif()', () => {
    it('saveToLibrary と addGifEntry が呼ばれる', async () => {
      const { result } = renderHook(() => useMediaActions());

      await act(async () => {
        await result.current.saveGif(GIF_URI, SIZE_BYTES, PRESET);
      });

      expect(mockSaveToLibrary).toHaveBeenCalledWith(GIF_URI);
      expect(mockAddGifEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'asset-001',
          sizeBytes: SIZE_BYTES,
          preset: PRESET,
        }),
      );
    });

    it('保存中は isSaving が true になる', async () => {
      let resolvePromise!: () => void;
      mockSaveToLibrary.mockReturnValue(
        new Promise<string>((resolve) => {
          resolvePromise = () => resolve('asset-001');
        }),
      );

      const { result } = renderHook(() => useMediaActions());

      act(() => {
        void result.current.saveGif(GIF_URI, SIZE_BYTES, PRESET);
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        resolvePromise();
      });

      expect(result.current.isSaving).toBe(false);
    });

    it('isSaving が true のとき二重実行を防ぐ', async () => {
      let resolveFirst!: () => void;
      mockSaveToLibrary.mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveFirst = () => resolve('asset-001');
        }),
      );

      const { result } = renderHook(() => useMediaActions());

      act(() => {
        void result.current.saveGif(GIF_URI, SIZE_BYTES, PRESET);
      });

      // 1 回目がまだ実行中に 2 回目を呼ぶ
      await act(async () => {
        await result.current.saveGif(GIF_URI, SIZE_BYTES, PRESET);
      });

      // saveToLibrary は 1 回のみ
      expect(mockSaveToLibrary).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirst();
      });
    });

    it('保存後は isSaving が false に戻る', async () => {
      const { result } = renderHook(() => useMediaActions());

      await act(async () => {
        await result.current.saveGif(GIF_URI, SIZE_BYTES, PRESET);
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  // ─── shareGif ───────────────────────────────────────────────────

  describe('shareGif()', () => {
    it('share が呼ばれる', async () => {
      const { result } = renderHook(() => useMediaActions());

      await act(async () => {
        await result.current.shareGif(GIF_URI);
      });

      expect(mockShare).toHaveBeenCalledWith(GIF_URI);
    });

    it('共有中は isSharing が true になる', async () => {
      let resolveShare!: () => void;
      mockShare.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveShare = resolve;
        }),
      );

      const { result } = renderHook(() => useMediaActions());

      act(() => {
        void result.current.shareGif(GIF_URI);
      });

      expect(result.current.isSharing).toBe(true);

      await act(async () => {
        resolveShare();
      });

      expect(result.current.isSharing).toBe(false);
    });

    it('isSharing が true のとき二重実行を防ぐ', async () => {
      let resolveFirst!: () => void;
      mockShare.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
      );

      const { result } = renderHook(() => useMediaActions());

      act(() => {
        void result.current.shareGif(GIF_URI);
      });

      await act(async () => {
        await result.current.shareGif(GIF_URI);
      });

      expect(mockShare).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirst();
      });
    });
  });
});
