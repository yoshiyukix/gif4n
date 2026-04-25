import { addGifEntry, getGifEntries, LibraryGifEntry } from '../GifLibraryStore';

// ─── expo-file-system のモック ─────────────────────────────────

// "mock" プレフィックスを付けることで jest.mock ファクトリからの参照が許可される
let mockFileContent: string | null = null;

jest.mock('expo-file-system', () => {
  const mockFile = {
    get exists() {
      return mockFileContent !== null;
    },
    text: jest.fn().mockImplementation(() => Promise.resolve(mockFileContent ?? '')),
    write: jest.fn().mockImplementation((data: string) => {
      mockFileContent = data;
      return Promise.resolve();
    }),
  };
  return {
    File: jest.fn().mockImplementation(() => mockFile),
    Paths: { document: 'file:///mock/document' },
  };
});

// ─── ヘルパー ──────────────────────────────────────────────────

function makeEntry(overrides: Partial<LibraryGifEntry> = {}): LibraryGifEntry {
  return {
    assetId: 'asset-001',
    sizeBytes: 1_000_000,
    preset: { width: 620, fps: 15 },
    createdAt: Date.now(),
    ...overrides,
  };
}

// ─── テストスイート ────────────────────────────────────────────

describe('GifLibraryStore', () => {
  beforeEach(() => {
    mockFileContent = null;
    jest.clearAllMocks();
  });

  // ────────────────────────────
  // getGifEntries
  // ────────────────────────────

  describe('getGifEntries()', () => {
    it('ファイルが存在しない場合は空配列を返す', async () => {
      const entries = await getGifEntries();
      expect(entries).toEqual([]);
    });

    it('保存済みエントリを返す', async () => {
      const entry = makeEntry();
      mockFileContent = JSON.stringify([entry]);

      const entries = await getGifEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(entry);
    });

    it('JSON が壊れている場合は空配列を返す（例外を握りつぶす）', async () => {
      mockFileContent = 'invalid json {{{';

      const entries = await getGifEntries();
      expect(entries).toEqual([]);
    });

    it('preset フィールドが欠損しているエントリはフィルタリングされる', async () => {
      mockFileContent = JSON.stringify([{ assetId: 'a', sizeBytes: 100, createdAt: 1000 }]);

      const entries = await getGifEntries();
      expect(entries).toEqual([]);
    });

    it('preset フィールドが null のエントリはフィルタリングされる', async () => {
      mockFileContent = JSON.stringify([
        { assetId: 'a', sizeBytes: 100, createdAt: 1000, preset: null },
      ]);

      const entries = await getGifEntries();
      expect(entries).toEqual([]);
    });

    it('preset の width が欠損しているエントリはフィルタリングされる', async () => {
      mockFileContent = JSON.stringify([
        { assetId: 'a', sizeBytes: 100, createdAt: 1000, preset: { fps: 15 } },
      ]);

      const entries = await getGifEntries();
      expect(entries).toEqual([]);
    });

    it('preset が正しければ通過する', async () => {
      const entry = makeEntry({ assetId: 'valid' });
      mockFileContent = JSON.stringify([entry]);

      const entries = await getGifEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].assetId).toBe('valid');
    });
  });

  // ────────────────────────────
  // addGifEntry
  // ────────────────────────────

  describe('addGifEntry()', () => {
    it('エントリを追加できる', async () => {
      const entry = makeEntry({ assetId: 'asset-001' });
      await addGifEntry(entry);

      const entries = await getGifEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(entry);
    });

    it('新しいエントリが先頭（新しい順）になる', async () => {
      const older = makeEntry({ assetId: 'old', createdAt: 1000 });
      const newer = makeEntry({ assetId: 'new', createdAt: 2000 });

      await addGifEntry(older);
      await addGifEntry(newer);

      const entries = await getGifEntries();
      expect(entries[0].assetId).toBe('new');
      expect(entries[1].assetId).toBe('old');
    });

    it('複数回 addGifEntry してもエントリが累積される', async () => {
      await addGifEntry(makeEntry({ assetId: 'a' }));
      await addGifEntry(makeEntry({ assetId: 'b' }));
      await addGifEntry(makeEntry({ assetId: 'c' }));

      const entries = await getGifEntries();
      expect(entries).toHaveLength(3);
      expect(entries.map((e) => e.assetId)).toEqual(['c', 'b', 'a']);
    });
  });
});
