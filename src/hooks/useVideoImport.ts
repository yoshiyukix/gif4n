import { useMemo } from 'react';
import { VideoImportService } from '../infrastructure/VideoImportService';
import { VideoAssetReference, VideoSource } from '../types';

export interface UseVideoImportResult {
  importAsset(asset: VideoAssetReference): Promise<VideoSource>;
  importFileUri(fileUri: string, filename: string, fileSize: number): Promise<VideoSource>;
}

/**
 * VideoImportService のインスタンスを生成し、動画インポート操作を提供する hook。
 * Presentation 層が Infrastructure を直接依存しないようにするための wiring hook。
 */
export function useVideoImport(): UseVideoImportResult {
  const service = useMemo(() => new VideoImportService(), []);
  return service;
}
