import {
  VideoSourcePreparationUseCase,
  VideoSourcePreparationRequest,
} from '../VideoSourcePreparationUseCase';

const mockSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 10,
  width: 1280,
  height: 720,
  fileSizeBytes: 5_000_000,
};

describe('VideoSourcePreparationUseCase', () => {
  it('Video Asset Reference request を importAsset へ委譲する', async () => {
    const importer = {
      importAsset: jest.fn().mockResolvedValue(mockSource),
      importFileUri: jest.fn(),
    };
    const request: VideoSourcePreparationRequest = {
      kind: 'asset-reference',
      asset: {
        id: 'asset-1',
        filename: 'IMG_0001.MP4',
        duration: 10,
        width: 1280,
        height: 720,
        uri: 'ph://asset-1',
      },
    };

    const useCase = new VideoSourcePreparationUseCase(importer);
    const result = await useCase.run(request);

    expect(importer.importAsset).toHaveBeenCalledWith(request.asset);
    expect(importer.importFileUri).not.toHaveBeenCalled();
    expect(result).toBe(mockSource);
  });

  it('file request を importFileUri へ委譲する', async () => {
    const importer = {
      importAsset: jest.fn(),
      importFileUri: jest.fn().mockResolvedValue(mockSource),
    };
    const request: VideoSourcePreparationRequest = {
      kind: 'file',
      fileUri: 'content://video/123',
      filename: 'clip.mp4',
      fileSize: 3_000_000,
    };

    const useCase = new VideoSourcePreparationUseCase(importer);
    const result = await useCase.run(request);

    expect(importer.importAsset).not.toHaveBeenCalled();
    expect(importer.importFileUri).toHaveBeenCalledWith(
      request.fileUri,
      request.filename,
      request.fileSize,
    );
    expect(result).toBe(mockSource);
  });
});
