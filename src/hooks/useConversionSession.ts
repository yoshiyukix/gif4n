import { useState, useCallback, useRef, useMemo } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeGifService } from '../infrastructure/NativeGifService';
import { SizeEstimator } from '../usecases/SizeEstimator';
import { ConversionUseCase, type OutputSizeResolver } from '../usecases/ConversionUseCase';
import { PilotEstimationUseCase } from '../usecases/PilotEstimationUseCase';
import { VideoSource, TrimRange, ConversionJob, QUALITY_PRESETS } from '../types';

async function defaultOutputSizeResolver(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

export interface ConversionSessionDependencies {
  pilotUseCase: Pick<PilotEstimationUseCase, 'run' | 'estimateStartIndex'>;
  conversionUseCase: Pick<ConversionUseCase, 'run'>;
  outputSizeResolver: OutputSizeResolver;
}

export interface UseConversionSessionOptions {
  maxSizeBytes: number;
  dependencies?: ConversionSessionDependencies;
}

export interface UseConversionSessionResult {
  job: ConversionJob | null;
  start: (source: VideoSource, trim: TrimRange) => void;
  cancel: () => void;
}

function createDefaultDependencies(): ConversionSessionDependencies {
  const nativeService = new NativeGifService();
  const estimator = new SizeEstimator();

  return {
    pilotUseCase: new PilotEstimationUseCase(nativeService),
    conversionUseCase: new ConversionUseCase(nativeService, estimator),
    outputSizeResolver: defaultOutputSizeResolver,
  };
}

export function useConversionSession(
  options: UseConversionSessionOptions,
): UseConversionSessionResult {
  const { maxSizeBytes, dependencies } = options;
  const [job, setJob] = useState<ConversionJob | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resolvedDependencies = useMemo(
    () => dependencies ?? createDefaultDependencies(),
    [dependencies],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(
    (source: VideoSource, trim: TrimRange) => {
      const abort = new AbortController();
      abortRef.current = abort;

      setJob({
        source,
        trim,
        preset: QUALITY_PRESETS[0],
        status: 'piloting',
        progressRate: 0,
        outputUri: null,
        outputSizeBytes: null,
      });

      async function runPilotPhase(): Promise<number | undefined> {
        const bytesPerSec = await resolvedDependencies.pilotUseCase.run(source, abort.signal);
        if (abort.signal.aborted) return undefined;
        const trimDurationSec = trim.endSec - trim.startSec;

        return bytesPerSec != null
          ? Math.max(
              0,
              resolvedDependencies.pilotUseCase.estimateStartIndex(
                bytesPerSec,
                trimDurationSec,
                maxSizeBytes,
              ),
            )
          : undefined;
      }

      async function runConversionPhase(startIndexOverride: number | undefined): Promise<void> {
        setJob((prev) => (prev ? { ...prev, status: 'running', progressRate: 0 } : null));

        const result = await resolvedDependencies.conversionUseCase.run(source, trim, {
          onProgress: (rate) => setJob((prev) => (prev ? { ...prev, progressRate: rate } : null)),
          signal: abort.signal,
          outputSizeResolver: resolvedDependencies.outputSizeResolver,
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
          return;
        }

        if (result.reason === 'cancelled') {
          setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
          return;
        }

        const errorReason = result.reason as 'too_large' | 'native_error';

        setJob((prev) =>
          prev
            ? {
                ...prev,
                status: 'error',
                errorMessage: result.message,
                errorReason,
              }
            : null,
        );
      }

      void (async () => {
        const startIndexOverride = await runPilotPhase();
        if (abort.signal.aborted) {
          setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
          return;
        }
        await runConversionPhase(startIndexOverride);
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
    [maxSizeBytes, resolvedDependencies],
  );

  return { job, start, cancel };
}
