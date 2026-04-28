import { useState, useCallback, useRef, useMemo } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeGifService } from '../infrastructure/NativeGifService';
import { SizeEstimator } from '../usecases/SizeEstimator';
import { ConversionUseCase } from '../usecases/ConversionUseCase';
import { PilotEstimationUseCase } from '../usecases/PilotEstimationUseCase';
import { VideoSource, TrimRange, ConversionJob, QUALITY_PRESETS } from '../types';

async function outputSizeResolver(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

export interface UseConversionProcessResult {
  job: ConversionJob | null;
  /** パイロット推定 → 本変換を直列実行する。外部から startIndexOverride を渡す必要はない。 */
  start: (source: VideoSource, trim: TrimRange) => void;
  cancel: () => void;
}

/**
 * NativeGifService + PilotEstimationUseCase + ConversionUseCase を内部生成し、
 * 「パイロット推定 → 最適プリセット選択 → GIF 変換」を一貫して提供する wiring hook。
 *
 * Presentation 層が Infrastructure / UseCase を直接依存しないようにするためのラッパー。
 *
 * @param maxSizeBytes 最大ファイルサイズ（バイト）
 */
export function useConversionProcess(maxSizeBytes: number): UseConversionProcessResult {
  const [job, setJob] = useState<ConversionJob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const nativeService = useMemo(() => new NativeGifService(), []);
  const estimator = useMemo(() => new SizeEstimator(), []);
  const pilotUseCase = useMemo(() => new PilotEstimationUseCase(nativeService), [nativeService]);
  const conversionUseCase = useMemo(
    () => new ConversionUseCase(nativeService, estimator),
    [nativeService, estimator],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(
    (source: VideoSource, trim: TrimRange) => {
      const abort = new AbortController();
      abortRef.current = abort;

      // Phase 1: パイロット推定中
      setJob({
        source,
        trim,
        preset: QUALITY_PRESETS[0],
        status: 'piloting',
        progressRate: 0,
        outputUri: null,
        outputSizeBytes: null,
      });

      (async () => {
        // --- Pilot ---
        const bytesPerSec = await pilotUseCase.run(source, abort.signal);
        if (abort.signal.aborted) {
          setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
          return;
        }

        const trimDurationSec = trim.endSec - trim.startSec;
        const startIndexOverride =
          bytesPerSec != null
            ? Math.max(
                0,
                pilotUseCase.estimateStartIndex(bytesPerSec, trimDurationSec, maxSizeBytes),
              )
            : undefined;

        // Phase 2: 本変換
        setJob((prev) => (prev ? { ...prev, status: 'running', progressRate: 0 } : null));

        const result = await conversionUseCase.run(source, trim, {
          onProgress: (rate) => setJob((prev) => (prev ? { ...prev, progressRate: rate } : null)),
          signal: abort.signal,
          outputSizeResolver,
          onPresetChange: (preset) => setJob((prev) => (prev ? { ...prev, preset } : null)),
          maxSizeBytes,
          startIndexOverride,
        });

        if (result.ok) {
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'done',
                  outputUri: result.outputUri,
                  outputSizeBytes: result.sizeBytes,
                  preset: result.preset,
                }
              : null,
          );
        } else if (result.reason === 'cancelled') {
          setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        } else {
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'error',
                  errorMessage: result.message,
                  errorReason: result.reason as 'too_large' | 'native_error',
                }
              : null,
          );
        }
      })().catch((e: unknown) => {
        if (abort.signal.aborted) {
          setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
          return;
        }
        const message = e instanceof Error ? e.message : String(e);
        setJob((prev) =>
          prev
            ? { ...prev, status: 'error', errorMessage: message, errorReason: 'native_error' }
            : null,
        );
      });
    },
    [pilotUseCase, conversionUseCase, maxSizeBytes],
  );

  return { job, start, cancel };
}
