import { VideoAssetReference, VideoSource } from '../types';

export type VideoSourcePreparationRequest =
  | {
      kind: 'asset-reference';
      asset: VideoAssetReference;
    }
  | {
      kind: 'file';
      fileUri: string;
      filename: string;
      fileSize: number;
    };

export interface IVideoSourceImporter {
  importAsset(asset: VideoAssetReference): Promise<VideoSource>;
  importFileUri(fileUri: string, filename: string, fileSize: number): Promise<VideoSource>;
}

export class VideoSourcePreparationUseCase {
  constructor(private readonly importer: IVideoSourceImporter) {}

  run(request: VideoSourcePreparationRequest): Promise<VideoSource> {
    if (request.kind === 'asset-reference') {
      return this.importer.importAsset(request.asset);
    }

    return this.importer.importFileUri(request.fileUri, request.filename, request.fileSize);
  }
}
