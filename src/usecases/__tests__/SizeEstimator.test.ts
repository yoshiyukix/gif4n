import { SizeEstimator } from '../SizeEstimator';
import { VideoSource, TrimRange } from '../../types';

describe('SizeEstimator', () => {
  let estimator: SizeEstimator;

  beforeEach(() => {
    estimator = new SizeEstimator();
  });

  // helper
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

  // ────────────────────────────────────────────────
  // estimateStartIndex
  // ────────────────────────────────────────────────

  describe('estimateStartIndex', () => {
    it('短い動画（5秒 / 620px / 15fps）はインデックス 0 を返す', () => {
      // 推定: 620 * (620*(720/1280)) * 15 * 5 * 0.010 ≒ 1.6MB < 10MB
      const source = makeSource({ durationSec: 30, width: 1280, height: 720 });
      const trim = makeTrim(0, 5);
      const idx = estimator.estimateStartIndex(source, trim);
      expect(idx).toBe(0);
    });

    it('長い動画（350秒 / 620px / 15fps）はインデックスが 0 より大きい', () => {
      // 推定: 620 * 348.75 * 15 * 350 * 0.010 ≈ 11.4MB > 10MB → idx > 0
      const source = makeSource({ durationSec: 350, width: 1280, height: 720 });
      const trim = makeTrim(0, 350);
      const idx = estimator.estimateStartIndex(source, trim);
      expect(idx).toBeGreaterThan(0);
    });

    it('全 preset で超過する場合はインデックス 8 を返す', () => {
      // 係数 0.010 で 320*240*5 * 10 = 38MB >> 10MB になるような超長動画
      // 320 * 240 * 5 * durationSec * 0.010 <= 10MB → durationSec <= 2604 sec
      // 係数が 0.010 の場合、実際には非常に長い動画が必要
      // 代わりに estimateBytes をモックせずに境界値を見つける
      // 320 * 240 * 5 * D * 0.010 = 384000 * D * 0.010 = 3840 * D
      // 3840 * D <= 10_000_000 → D <= 2604
      // よって D = 3000 秒なら必ず 8 を返す
      const source = makeSource({ durationSec: 3000, width: 320, height: 240 });
      const trim = makeTrim(0, 3000);
      const idx = estimator.estimateStartIndex(source, trim);
      expect(idx).toBe(8);
    });

    it('トリミング範囲の長さで推定する（元動画の durationSec ではなく）', () => {
      // durationSec=400 だが trim短は 5 秒、trim長は 400 秒
      // 400 秒 @ 620px/15fps: ≈ 13.0MB > 10MB → idx_full > 0
      // 5 秒 @ 620px/15fps: ≈ 0.16MB < 10MB → idx_short = 0
      const source = makeSource({ durationSec: 400, width: 1280, height: 720 });
      const trimShort = makeTrim(0, 5);
      const trimFull = makeTrim(0, 400);
      const idxShort = estimator.estimateStartIndex(source, trimShort);
      const idxFull = estimator.estimateStartIndex(source, trimFull);
      expect(idxShort).toBeLessThan(idxFull);
    });

    it('返り値は 0 以上 8 以下の整数', () => {
      const source = makeSource();
      const trim = makeTrim(0, 10);
      const idx = estimator.estimateStartIndex(source, trim);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(8);
      expect(Number.isInteger(idx)).toBe(true);
    });

    it('maxSizeBytes=5MB を指定すると 10MB 基準より高いインデックスを返す', () => {
      // 10MB 基準では index 0 が返るが、5MB 基準では index > 0 になる動画長を選ぶ
      // 推定: 620 * (620*(720/1280)) * 15 * 60 * 0.010 ≒ 19MB > 10MB → 10MB でも 0 より大
      // 推定: 620 * (620*(720/1280)) * 15 * 5 * 0.010 ≒ 1.6MB
      //   5MB なら idx_5mb === idx_10mb — なので、5MB 超えになる秒数を選ぶ
      // 620 * 348.75 * 15 * D * 0.010 = 32390.625 * D
      // 32390.625 * D <= 5MB=5,242,880 → D <= 161.8 sec
      // 32390.625 * D <= 10MB=10,485,760 → D <= 323.7 sec
      // D = 200 で: 5MB超 10MB以下
      const source = makeSource({ durationSec: 200, width: 1280, height: 720 });
      const trim = makeTrim(0, 200);
      const idx10mb = estimator.estimateStartIndex(source, trim);
      const idx5mb = estimator.estimateStartIndex(source, trim, 5 * 1024 * 1024);
      expect(idx5mb).toBeGreaterThan(idx10mb);
    });

    it('maxSizeBytes を省略すると 10MB がデフォルト閾値になる', () => {
      const source = makeSource({ durationSec: 200, width: 1280, height: 720 });
      const trim = makeTrim(0, 200);
      const idxDefault = estimator.estimateStartIndex(source, trim);
      const idx10mb = estimator.estimateStartIndex(source, trim, 10 * 1024 * 1024);
      expect(idxDefault).toBe(idx10mb);
    });

    it('出力幅は動画アスペクト比を保持して preset の幅にスケールする', () => {
      // 正方形動画と横長動画でインデックスが変わることを確認
      const squareSource = makeSource({
        durationSec: 30,
        width: 1000,
        height: 1000,
      });
      const wideSource = makeSource({ durationSec: 30, width: 1000, height: 100 });
      const trim = makeTrim(0, 30);
      const idxSquare = estimator.estimateStartIndex(squareSource, trim);
      const idxWide = estimator.estimateStartIndex(wideSource, trim);
      // 正方形の方が高さが大きい → ファイルサイズが大きくなるはず
      expect(idxSquare).toBeGreaterThanOrEqual(idxWide);
    });
  });

  // ────────────────────────────────────────────────
  // estimateBytes (ホワイトボックスで補助検証)
  // ────────────────────────────────────────────────

  describe('estimateBytes', () => {
    it('推定バイト数は正の数値', () => {
      const source = makeSource();
      const trim = makeTrim(0, 10);
      const bytes = estimator.estimateBytes(source, trim, { width: 620, fps: 15 });
      expect(bytes).toBeGreaterThan(0);
    });

    it('fps が高いほど推定サイズが大きい', () => {
      const source = makeSource();
      const trim = makeTrim(0, 10);
      const bytes15 = estimator.estimateBytes(source, trim, { width: 620, fps: 15 });
      const bytes5 = estimator.estimateBytes(source, trim, { width: 620, fps: 5 });
      expect(bytes15).toBeGreaterThan(bytes5);
    });

    it('解像度が高いほど推定サイズが大きい', () => {
      const source = makeSource();
      const trim = makeTrim(0, 10);
      const bytes620 = estimator.estimateBytes(source, trim, { width: 620, fps: 15 });
      const bytes320 = estimator.estimateBytes(source, trim, { width: 320, fps: 15 });
      expect(bytes620).toBeGreaterThan(bytes320);
    });

    it('動画が長いほど推定サイズが大きい', () => {
      const source = makeSource();
      const trimLong = makeTrim(0, 30);
      const trimShort = makeTrim(0, 5);
      const bytesLong = estimator.estimateBytes(source, trimLong, { width: 620, fps: 15 });
      const bytesShort = estimator.estimateBytes(source, trimShort, { width: 620, fps: 15 });
      expect(bytesLong).toBeGreaterThan(bytesShort);
    });
  });
});
