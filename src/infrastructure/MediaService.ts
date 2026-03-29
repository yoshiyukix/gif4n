import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// ─── インターフェース ────────────────────────────────────────────

export interface IMediaService {
  saveToLibrary(uri: string): Promise<void>;
  share(uri: string): Promise<void>;
}

// react-native は遅延ロード（jest-expo/node では react-native-web へのマッピングを避けるため）
function defaultPermissionDenied(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Alert, Linking } = require('react-native') as typeof import('react-native');
  Alert.alert(
    'カメラロールへのアクセスが必要です',
    '設定からアクセスを許可してください。',
    [
      { text: '設定を開く', onPress: () => Linking.openSettings() },
      { text: 'キャンセル', style: 'cancel' },
    ],
  );
}

// ─── 実装 ────────────────────────────────────────────────────────

export class MediaService implements IMediaService {
  private readonly onPermissionDenied: () => void;

  constructor(onPermissionDenied?: () => void) {
    this.onPermissionDenied = onPermissionDenied ?? defaultPermissionDenied;
  }

  async saveToLibrary(uri: string): Promise<void> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      this.onPermissionDenied();
      return;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
  }

  async share(uri: string): Promise<void> {
    const available = await Sharing.isAvailableAsync();
    if (!available) return;
    await Sharing.shareAsync(uri, { mimeType: 'image/gif' });
  }
}
