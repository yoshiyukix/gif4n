import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ─── モック ──────────────────────────────────────────────────────

jest.mock('../../hooks/useTrim', () => ({
  useTrim: jest.fn().mockReturnValue({
    trimRange: { startSec: 0, endSec: 5 },
    setStart: jest.fn(),
    setEnd: jest.fn(),
  }),
}));
jest.mock('../../components/VideoPreview', () => ({ VideoPreview: 'VideoPreview' }));
jest.mock('../../components/TrimSlider', () => ({ TrimSlider: 'TrimSlider' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/thumb.jpg' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0 }),
}));

// ─── フィクスチャ ────────────────────────────────────────────────

const mockSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 10,
  width: 1280,
  height: 720,
  fileSizeBytes: 5_000_000,
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

function makeNavigation() {
  return { navigate: mockNavigate, goBack: mockGoBack };
}

function makeRoute() {
  return { params: { source: mockSource } };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TrimScreen = require('../TrimScreen').default;

function renderScreen() {
  return render(
    React.createElement(TrimScreen, {
      route: makeRoute(),
      navigation: makeNavigation(),
    }),
  );
}

// ─── テストスイート ──────────────────────────────────────────────

describe('TrimScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('パイロット待機なしで変換ボタンが表示される', () => {
    const { getByText } = renderScreen();

    // パイロット完了を待たずに即座にボタン文言が表示される
    expect(getByText('GIF動画に変換')).toBeTruthy();
  });

  it('変換ボタンを押すと estimatedStartIndex なしで Converting 画面へ遷移する', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('GIF動画に変換'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'Converting',
        expect.objectContaining({
          source: mockSource,
          trimRange: { startSec: 0, endSec: 5 },
        }),
      );
    });

    // estimatedStartIndex は渡さない（Converting 側で推定する）
    const callArgs = mockNavigate.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(callArgs)).not.toContain('estimatedStartIndex');
  });

  it('戻るボタンを押すと goBack が呼ばれる', () => {
    const { UNSAFE_getAllByType } = renderScreen();

    // 最初の TouchableOpacity が Back ボタン
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity } = require('react-native') as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
