import * as MediaLibraryModule from 'expo-media-library';
import * as SharingModule from 'expo-sharing';
import { MediaService } from '../MediaService';

// ─── expo-media-library と expo-sharing のモック ────────────────

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  createAssetAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const MediaLibrary = jest.mocked(
  MediaLibraryModule as unknown as {
    requestPermissionsAsync: jest.Mock;
    createAssetAsync: jest.Mock;
  },
);
const Sharing = jest.mocked(
  SharingModule as unknown as {
    isAvailableAsync: jest.Mock;
    shareAsync: jest.Mock;
  },
);

// ─── テストスイート ──────────────────────────────────────────────

describe('MediaService', () => {
  let onPermissionDenied: jest.Mock;
  let service: MediaService;

  beforeEach(() => {
    onPermissionDenied = jest.fn();
    service = new MediaService(onPermissionDenied);
    jest.clearAllMocks();
  });

  // ────────────────────────────
  // saveToLibrary
  // ────────────────────────────

  describe('saveToLibrary', () => {
    it('権限がある場合に createAssetAsync を呼び出し、assetId を返す', async () => {
      MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      MediaLibrary.createAssetAsync.mockResolvedValue({ id: 'asset-123' });

      const assetId = await service.saveToLibrary('file:///tmp/out.gif');

      expect(MediaLibrary.createAssetAsync).toHaveBeenCalledWith('file:///tmp/out.gif');
      expect(assetId).toBe('asset-123');
    });

    it('権限拒否の場合は createAssetAsync を呼ばない', async () => {
      MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await expect(service.saveToLibrary('file:///tmp/out.gif')).rejects.toThrow('permission_denied');

      expect(MediaLibrary.createAssetAsync).not.toHaveBeenCalled();
    });

    it('権限拒否の場合は onPermissionDenied コールバックを呼び、例外を投げる', async () => {
      MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await expect(service.saveToLibrary('file:///tmp/out.gif')).rejects.toThrow('permission_denied');

      expect(onPermissionDenied).toHaveBeenCalled();
    });

    it('requestPermissionsAsync が呼ばれる', async () => {
      MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      MediaLibrary.createAssetAsync.mockResolvedValue({ id: 'asset-456' });

      await service.saveToLibrary('file:///tmp/out.gif');

      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });
  });

  // ────────────────────────────
  // share
  // ────────────────────────────

  describe('share', () => {
    it('共有が利用可能な場合に shareAsync を呼び出す', async () => {
      Sharing.isAvailableAsync.mockResolvedValue(true);
      Sharing.shareAsync.mockResolvedValue(undefined);

      await service.share('file:///tmp/out.gif');

      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/out.gif', expect.any(Object));
    });

    it('共有が利用不可の場合は shareAsync を呼ばない', async () => {
      Sharing.isAvailableAsync.mockResolvedValue(false);

      await service.share('file:///tmp/out.gif');

      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it('isAvailableAsync が呼ばれる', async () => {
      Sharing.isAvailableAsync.mockResolvedValue(true);
      Sharing.shareAsync.mockResolvedValue(undefined);

      await service.share('file:///tmp/out.gif');

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    });
  });
});
