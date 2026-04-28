import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useTrimPilot } from '../../hooks/useTrimPilot';
import { useSettings } from '../../hooks/useSettings';

// ─── モック ──────────────────────────────────────────────────────

let mockIsPilotDone = false;
let mockBytesPerSec: number | null = null;
const mockEstimateStartIndex = jest.fn().mockReturnValue(0);

jest.mock('../../hooks/useTrimPilot', () => ({
  useTrimPilot: jest.fn(),
}));
jest.mock('../../hooks/useSettings', () => ({
  useSettings: jest.fn(),
}));
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

const mockUseTrimPilot = useTrimPilot as jest.Mock;
const mockUseSettings = useSettings as jest.Mock;

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
  mockUseTrimPilot.mockReturnValue({
    bytesPerSec: mockBytesPerSec,
    isPilotDone: mockIsPilotDone,
    estimateStartIndex: mockEstimateStartIndex,
  });
  mockUseSettings.mockReturnValue({ settings: { maxSizeMb: 8 } });

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
    mockIsPilotDone = false;
    mockBytesPerSec = null;
  });

  it('isPilotDone=false のとき変換ボタンが無効化される', () => {
    mockIsPilotDone = false;
    const { queryByText } = renderScreen();

    // isPilotDone=false のとき ActivityIndicator が表示されボタン文言は非表示
    expect(queryByText('GIF動画に変換')).toBeNull();
  });

  it('isPilotDone=true のとき変換ボタンが表示される', () => {
    mockIsPilotDone = true;
    const { getByText } = renderScreen();

    expect(getByText('GIF動画に変換')).toBeTruthy();
  });

  it('isPilotDone=true で変換ボタンを押すと Converting 画面へ遷移する', async () => {
    mockIsPilotDone = true;
    mockBytesPerSec = 200_000;
    mockEstimateStartIndex.mockReturnValue(1);

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
  });

  it('パイロット完了済みのとき estimatedStartIndex が渡される', async () => {
    mockIsPilotDone = true;
    mockBytesPerSec = 200_000;
    mockEstimateStartIndex.mockReturnValue(2);

    const { getByText } = renderScreen();
    fireEvent.press(getByText('GIF動画に変換'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'Converting',
        expect.objectContaining({ estimatedStartIndex: 2 }),
      );
    });
  });

  it('パイロット未完了（bytesPerSec=null）のとき estimatedStartIndex が undefined になる', async () => {
    mockIsPilotDone = true;
    mockBytesPerSec = null;

    const { getByText } = renderScreen();
    fireEvent.press(getByText('GIF動画に変換'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'Converting',
        expect.objectContaining({ estimatedStartIndex: undefined }),
      );
    });
  });

  it('戻るボタンを押すと goBack が呼ばれる', () => {
    mockIsPilotDone = true;
    const { UNSAFE_getAllByType } = renderScreen();

    // 最初の TouchableOpacity が Back ボタン
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity } = require('react-native') as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
