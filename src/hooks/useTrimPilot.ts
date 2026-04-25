import { useMemo } from 'react';
import { VideoSource } from '../types';
import { NativeGifService } from '../infrastructure/NativeGifService';
import { PilotEstimationUseCase } from '../usecases/PilotEstimationUseCase';
import { usePilotEstimation, UsePilotEstimationResult } from './usePilotEstimation';

export interface UseTrimPilotResult extends UsePilotEstimationResult {
  /** パイロット実測値からトリミング開始インデックスを推定する（0 以下は 0 にクランプ済み）*/
  estimateStartIndex(trimDurationSec: number, maxSizeBytes: number): number | undefined;
}

/**
 * NativeGifService + PilotEstimationUseCase を内部生成し、パイロット変換結果を返す wiring hook。
 * Presentation 層が Infrastructure / UseCase を直接依存しないようにするためのラッパー。
 */
export function useTrimPilot(source: VideoSource): UseTrimPilotResult {
  const nativeService = useMemo(() => new NativeGifService(), []);
  const pilotUseCase = useMemo(() => new PilotEstimationUseCase(nativeService), [nativeService]);
  const { bytesPerSec, isPilotDone } = usePilotEstimation(source, pilotUseCase);

  function estimateStartIndex(trimDurationSec: number, maxSizeBytes: number): number | undefined {
    if (bytesPerSec == null) return undefined;
    return Math.max(0, pilotUseCase.estimateStartIndex(bytesPerSec, trimDurationSec, maxSizeBytes));
  }

  return { bytesPerSec, isPilotDone, estimateStartIndex };
}
