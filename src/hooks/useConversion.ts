import { useState, useCallback, useRef } from 'react';
import { VideoSource, TrimRange, ConversionJob, ConversionStatus, QUALITY_PRESETS } from '../types';
import { IConversionUseCase, OutputSizeResolver } from '../usecases/ConversionUseCase';

// ─── 公開型 ────────────────────────────────────────────────────

export interface UseConversionOptions {
  useCase: IConversionUseCase;
  outputSizeResolver: OutputSizeResolver;
  maxSizeBytes?: number;
}

export interface UseConversionResult {
  job: ConversionJob | null;
  start: (source: VideoSource, trim: TrimRange, startIndexOverride?: number) => void;
  cancel: () => void;
}

// ─── 実装 ──────────────────────────────────────────────────────

export function useConversion(options: UseConversionOptions): UseConversionResult {
  const { useCase, outputSizeResolver, maxSizeBytes } = options;
  const [job, setJob] = useState<ConversionJob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    (source: VideoSource, trim: TrimRange, startIndexOverride?: number) => {
      const abort = new AbortController();
      abortRef.current = abort;

      const initial: ConversionJob = {
        source,
        trim,
        preset: QUALITY_PRESETS[0],
        status: 'running' as ConversionStatus,
        progressRate: 0,
        outputUri: null,
        outputSizeBytes: null,
      };
      setJob(initial);

      useCase
        .run(source, trim, {
          onProgress: (rate) => setJob((prev) => (prev ? { ...prev, progressRate: rate } : null)),
          signal: abort.signal,
          outputSizeResolver,
          onPresetChange: (preset) => setJob((prev) => (prev ? { ...prev, preset } : null)),
          maxSizeBytes,
          startIndexOverride,
        })
        .then((result) => {
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
        })
        .catch((e: unknown) => {
          const message = e instanceof Error ? e.message : String(e);
          setJob((prev) => (prev ? { ...prev, status: 'error', errorMessage: message } : null));
        });
    },
    [useCase, outputSizeResolver, maxSizeBytes],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { job, start, cancel };
}
