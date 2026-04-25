import { useMemo } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeGifService } from '../infrastructure/NativeGifService';
import { SizeEstimator } from '../usecases/SizeEstimator';
import { ConversionUseCase } from '../usecases/ConversionUseCase';
import { useConversion, UseConversionResult } from './useConversion';

async function outputSizeResolver(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

/**
 * NativeGifService + SizeEstimator + ConversionUseCase を内部生成し、GIF 変換操作を提供する
 * wiring hook。Presentation 層が Infrastructure / UseCase を直接依存しないようにするためのラッパー。
 *
 * @param maxSizeBytes 最大ファイルサイズ（バイト）
 */
export function useConversionProcess(maxSizeBytes: number): UseConversionResult {
  const nativeService = useMemo(() => new NativeGifService(), []);
  const estimator = useMemo(() => new SizeEstimator(), []);
  const useCase = useMemo(
    () => new ConversionUseCase(nativeService, estimator),
    [nativeService, estimator],
  );
  return useConversion({ useCase, outputSizeResolver, maxSizeBytes });
}
