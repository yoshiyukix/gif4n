import {
  QUALITY_PRESETS,
  ConversionResult,
  ConversionStatus,
  ConversionJob,
  VideoSource,
  TrimRange,
  QualityPreset,
} from '../../types';

describe('types/index', () => {
  // ────────────────────────────────────────────────
  // QUALITY_PRESETS
  // ────────────────────────────────────────────────

  describe('QUALITY_PRESETS', () => {
    it('6 段階の品質設定が定義されている', () => {
      expect(QUALITY_PRESETS).toHaveLength(6);
    });

    it('最高品質は 620px / 15fps', () => {
      expect(QUALITY_PRESETS[0]).toEqual({ width: 620, fps: 15 });
    });

    it('最低品質は 320px / 10fps', () => {
      expect(QUALITY_PRESETS[5]).toEqual({ width: 320, fps: 10 });
    });

    it('F-022 の優先順位どおりに並んでいる', () => {
      const expected: QualityPreset[] = [
        { width: 620, fps: 15 },
        { width: 620, fps: 10 },
        { width: 480, fps: 15 },
        { width: 480, fps: 10 },
        { width: 320, fps: 15 },
        { width: 320, fps: 10 },
      ];
      expect(QUALITY_PRESETS).toEqual(expected);
    });

    it('各 preset の width は 320 | 480 | 620 のいずれか', () => {
      const validWidths = [320, 480, 620];
      QUALITY_PRESETS.forEach((p) => {
        expect(validWidths).toContain(p.width);
      });
    });

    it('各 preset の fps は 10 | 15 のいずれか', () => {
      const validFps = [10, 15];
      QUALITY_PRESETS.forEach((p) => {
        expect(validFps).toContain(p.fps);
      });
    });
  });

  // ────────────────────────────────────────────────
  // ConversionResult 型の実行時構造チェック
  // ────────────────────────────────────────────────

  describe('ConversionResult', () => {
    it('ok: true のとき outputUri / sizeBytes / preset を持つ', () => {
      const result: ConversionResult = {
        ok: true,
        outputUri: 'file:///tmp/out.gif',
        sizeBytes: 1024 * 1024,
        preset: { width: 620, fps: 15 },
      };
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.outputUri).toBe('file:///tmp/out.gif');
        expect(result.sizeBytes).toBe(1024 * 1024);
        expect(result.preset).toEqual({ width: 620, fps: 15 });
      }
    });

    it('ok: false のとき reason と message を持つ', () => {
      const result: ConversionResult = {
        ok: false,
        reason: 'too_large',
        message: '全品質設定で 10MB を超えました',
      };
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('too_large');
        expect(result.message).toBeTruthy();
      }
    });

    it('reason は too_large | cancelled | native_error のいずれか', () => {
      const validReasons = ['too_large', 'cancelled', 'native_error'];
      const result: ConversionResult = {
        ok: false,
        reason: 'cancelled',
        message: 'キャンセルされました',
      };
      if (!result.ok) {
        expect(validReasons).toContain(result.reason);
      }
    });
  });

  // ────────────────────────────────────────────────
  // ConversionJob の構造チェック
  // ────────────────────────────────────────────────

  describe('ConversionJob', () => {
    const source: VideoSource = {
      uri: 'file:///tmp/test.mp4',
      durationSec: 10,
      width: 1280,
      height: 720,
      fileSizeBytes: 5 * 1024 * 1024,
    };
    const trim: TrimRange = { startSec: 0, endSec: 5 };
    const preset: QualityPreset = { width: 620, fps: 15 };

    it('idle 状態の ConversionJob を生成できる', () => {
      const job: ConversionJob = {
        source,
        trim,
        preset,
        status: 'idle',
        progressRate: 0,
        outputUri: null,
        outputSizeBytes: null,
      };
      expect(job.status).toBe('idle');
      expect(job.progressRate).toBe(0);
      expect(job.outputUri).toBeNull();
    });

    it('done 状態では outputUri と outputSizeBytes が設定されている', () => {
      const job: ConversionJob = {
        source,
        trim,
        preset,
        status: 'done',
        progressRate: 1,
        outputUri: 'file:///tmp/out.gif',
        outputSizeBytes: 8 * 1024 * 1024,
      };
      expect(job.status).toBe('done');
      expect(job.outputUri).not.toBeNull();
      expect(job.outputSizeBytes).not.toBeNull();
    });
  });

  // ────────────────────────────────────────────────
  // ConversionStatus の全ステータス確認
  // ────────────────────────────────────────────────

  describe('ConversionStatus', () => {
    it('すべての有効ステータスを受け入れる', () => {
      const statuses: ConversionStatus[] = ['idle', 'running', 'done', 'cancelled', 'error'];
      expect(statuses).toHaveLength(5);
    });
  });
});
