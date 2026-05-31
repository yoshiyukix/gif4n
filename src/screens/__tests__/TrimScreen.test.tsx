import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../hooks/useTrim', () => ({
  useTrim: jest.fn().mockReturnValue({
    trimRange: { startSec: 0, endSec: 5 },
    setStart: jest.fn(),
    setEnd: jest.fn(),
  }),
}));
jest.mock('../../components/VideoPreview', () => ({ VideoPreview: 'VideoPreview' }));
jest.mock('../../components/TrimSlider', () => ({ TrimSlider: 'TrimSlider' }));
const mockGetConversionPreviewThumbnail = jest.fn();
jest.mock('../../infrastructure/VideoThumbnailService', () => ({
  videoThumbnailService: {
    getConversionPreviewThumbnail: (...args: unknown[]) =>
      mockGetConversionPreviewThumbnail(...args),
  },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0 }),
}));

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

describe('TrimScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConversionPreviewThumbnail.mockResolvedValue('file:///tmp/thumb.jpg');
  });

  it('パイロット待機なしで変換ボタンが表示される', () => {
    const { getByText } = renderScreen();

    expect(getByText('GIF動画に変換')).toBeTruthy();
  });

  it('変換ボタンを押すと Converting 画面へ遷移する', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('GIF動画に変換'));

    await waitFor(() => {
      expect(mockGetConversionPreviewThumbnail).toHaveBeenCalledWith(mockSource, 0);
      expect(mockNavigate).toHaveBeenCalledWith(
        'Converting',
        expect.objectContaining({
          source: mockSource,
          trimRange: { startSec: 0, endSec: 5 },
        }),
      );
    });
  });

  it('選択時間が MIN_DURATION_SEC 未満のとき変換ボタンを押しても遷移しない', () => {
    const { useTrim: mockUseTrim } = jest.requireMock('../../hooks/useTrim') as {
      useTrim: jest.Mock;
    };
    mockUseTrim.mockReturnValueOnce({
      trimRange: { startSec: 0, endSec: 0.3 },
      setStart: jest.fn(),
      setEnd: jest.fn(),
    });

    const { getByText } = renderScreen();
    fireEvent.press(getByText('GIF動画に変換'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('戻るボタンを押すと goBack が呼ばれる', () => {
    const { UNSAFE_getAllByType } = renderScreen();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity } = require('react-native') as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
