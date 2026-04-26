import { renderHook, act } from '@testing-library/react-native';
import { useGifLibrary } from '../useGifLibrary';
import { LibraryGifEntry } from '../../infrastructure/GifLibraryStore';

// ─── モック ──────────────────────────────────────────────────────

const mockGetGifEntries = jest.fn();
jest.mock('../../infrastructure/GifLibraryStore', () => ({
  getGifEntries: (...args: unknown[]) => mockGetGifEntries(...args),
}));

const mockRequestPermissionsAsync = jest.fn();
const mockGetAssetInfoAsync = jest.fn();
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  getAssetInfoAsync: (...args: unknown[]) => mockGetAssetInfoAsync(...args),
}));

// ─── フィクスチャ ────────────────────────────────────────────────

function makeEntry(overrides: Partial<LibraryGifEntry> = {}): LibraryGifEntry {
  return {
    assetId: 'asset-001',
    sizeBytes: 1_000_000,
    preset: { width: 620, fps: 15 },
    createdAt: 1_000_000,
    ...overrides,
  };
}

// ─── テストスイート ──────────────────────────────────────────────

describe('useGifLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true });
  });

  it('初期状態: items は空・loading は true', () => {
    mockGetGifEntries.mockResolvedValue([]);
    const { result } = renderHook(() => useGifLibrary());

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('loadItems() で GIF エントリを取得して items に反映する', async () => {
    const entry = makeEntry();
    mockGetGifEntries.mockResolvedValue([entry]);
    mockGetAssetInfoAsync.mockResolvedValue({
      localUri: 'file:///photos/out.gif',
      uri: 'ph://asset-001',
    });

    const { result } = renderHook(() => useGifLibrary());

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual({
      entry,
      localUri: 'file:///photos/out.gif',
    });
    expect(result.current.loading).toBe(false);
  });

  it('権限が拒否された場合は items が空のまま loading が false になる', async () => {
    mockRequestPermissionsAsync.mockResolvedValue({ granted: false });

    const { result } = renderHook(() => useGifLibrary());

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockGetGifEntries).not.toHaveBeenCalled();
  });

  it('localUri がないエントリはスキップされる', async () => {
    const entry = makeEntry();
    mockGetGifEntries.mockResolvedValue([entry]);
    // localUri も uri も空文字
    mockGetAssetInfoAsync.mockResolvedValue({ localUri: '', uri: '' });

    const { result } = renderHook(() => useGifLibrary());

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('getAssetInfoAsync が例外をスローしたエントリはスキップされる', async () => {
    const entry1 = makeEntry({ assetId: 'asset-001' });
    const entry2 = makeEntry({ assetId: 'asset-002' });
    mockGetGifEntries.mockResolvedValue([entry1, entry2]);
    mockGetAssetInfoAsync
      .mockRejectedValueOnce(new Error('deleted'))
      .mockResolvedValueOnce({ localUri: 'file:///photos/out2.gif', uri: 'ph://asset-002' });

    const { result } = renderHook(() => useGifLibrary());

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].entry.assetId).toBe('asset-002');
  });

  it('loadItems() を複数回呼んだとき最新結果が反映される', async () => {
    const entry1 = makeEntry({ assetId: 'asset-001' });
    const entry2 = makeEntry({ assetId: 'asset-002' });
    mockGetGifEntries.mockResolvedValueOnce([entry1]).mockResolvedValueOnce([entry1, entry2]);
    mockGetAssetInfoAsync.mockResolvedValue({ localUri: 'file:///photos/out.gif', uri: '' });

    const { result } = renderHook(() => useGifLibrary());

    await act(async () => {
      await result.current.loadItems();
    });
    expect(result.current.items).toHaveLength(1);

    await act(async () => {
      await result.current.loadItems();
    });
    expect(result.current.items).toHaveLength(2);
  });
});
