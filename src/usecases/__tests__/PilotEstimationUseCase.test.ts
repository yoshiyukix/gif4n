import { PilotEstimationUseCase, IPilotNativeService } from '../PilotEstimationUseCase';
import { VideoSource, QUALITY_PRESETS } from '../../types';

// ─── ヘルパー ────────────────────────────────────────────────────

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

function makeNativeService(bytesPerSec = 100_000): jest.Mocked<IPilotNativeService> {
  return {
    convertPilot: jest.fn().mockResolvedValue(bytesPerSec),
  };
}

// ─── テストスイート ──────────────────────────────────────────────

describe('PilotEstimationUseCase', () => {
  describe('run()', () => {
    it('convertPilot の結果を bytes/sec として返す', async () => {
      const native = makeNativeService(200_000);
      const useCase = new PilotEstimationUseCase(native);
      const controller = new AbortController();

      const result = await useCase.run(makeSource(), controller.signal);

      expect(result).toBe(200_000);
    });

    it('convertPilot がキャンセルされると null を返す', async () => {
      const native = {
        convertPilot: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' })),
      };
      const useCase = new PilotEstimationUseCase(native);
      const controller = new AbortController();

      const result = await useCase.run(makeSource(), controller.signal);

      expect(result).toBeNull();
    });

    it('convertPilot が予期しないエラーを投げると null を返す', async () => {
      const native = { convertPilot: jest.fn().mockRejectedValue(new Error('native error')) };
      const useCase = new PilotEstimationUseCase(native);
      const controller = new AbortController();

      const result = await useCase.run(makeSource(), controller.signal);

      expect(result).toBeNull();
    });

    it('convertPilot が 0 を返したとき null を返す', async () => {
      const native = makeNativeService(0);
      const useCase = new PilotEstimationUseCase(native);
      const controller = new AbortController();

      const result = await useCase.run(makeSource(), controller.signal);

      expect(result).toBeNull();
    });
  });

  describe('estimateStartIndex()', () => {
    let useCase: PilotEstimationUseCase;

    beforeEach(() => {
      const native = makeNativeService();
      useCase = new PilotEstimationUseCase(native);
    });

    it('短時間トリムでは最高品質（インデックス 0）を返す', () => {
      // 1 秒 @ QUALITY_PRESETS[0] で 10KB → 10KB × 5秒 = 50KB << 10MB
      const idx = useCase.estimateStartIndex(10_000, 5, 10 * 1024 * 1024);
      expect(idx).toBe(0);
    });

    it('長時間トリムでは低品質のインデックスを返す', () => {
      // pilot = 500_000 bytes/sec, trim = 60sec
      // PRESETS[0](620/15) の推定 = 500_000 × 60 × 1.0 = 30MB > 10MB
      // → より低品質なインデックスになる
      const idx = useCase.estimateStartIndex(500_000, 60, 10 * 1024 * 1024);
      expect(idx).toBeGreaterThan(0);
    });

    it('全プリセット超過の場合は最低品質インデックスを返す', () => {
      // 極端に大きい bytes/sec と長い duration
      const idx = useCase.estimateStartIndex(10_000_000, 1000, 10 * 1024 * 1024);
      expect(idx).toBe(QUALITY_PRESETS.length - 1);
    });

    it('返り値は 0 以上 5 以下の整数', () => {
      const idx = useCase.estimateStartIndex(100_000, 10, 10 * 1024 * 1024);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(QUALITY_PRESETS.length - 1);
      expect(Number.isInteger(idx)).toBe(true);
    });

    it('小さい bytesPerSec では最高品質（インデックス 0）を返す', () => {
      // パイロットが中間品質(480/10fps)で計測した場合、スケール係数(≈2.5)を考慮して
      // 最高品質が maxSizeBytes 以内に収まると判定できる場合はインデックス 0 を返す
      // 80KB/sec × 10sec × scale(≈2.5) = 2MB < 10MB → インデックス 0
      const idx = useCase.estimateStartIndex(80_000, 10, 10 * 1024 * 1024);
      expect(idx).toBe(0);
    });

    it('maxSizeBytes が小さいと高インデックスになる', () => {
      const idxSmallLimit = useCase.estimateStartIndex(100_000, 10, 100_000);
      const idxLargeLimit = useCase.estimateStartIndex(100_000, 10, 100 * 1024 * 1024);
      expect(idxSmallLimit).toBeGreaterThanOrEqual(idxLargeLimit);
    });
  });
});
