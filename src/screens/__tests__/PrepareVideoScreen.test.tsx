import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockRun = jest.fn();

jest.mock('../../usecases/VideoSourcePreparationUseCase', () => ({
  VideoSourcePreparationUseCase: jest.fn().mockImplementation(() => ({
    run: mockRun,
  })),
}));
jest.mock('../../infrastructure/VideoImportService', () => ({
  VideoImportService: jest.fn(),
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

const assetRequest = {
  kind: 'asset-reference' as const,
  asset: {
    id: 'asset-1',
    filename: 'IMG_0001.MP4',
    duration: 10,
    width: 1280,
    height: 720,
    uri: 'ph://asset-1',
  },
};

const mockReplace = jest.fn();
const mockGoBack = jest.fn();

function makeNavigation() {
  return {
    replace: mockReplace,
    goBack: mockGoBack,
  };
}

function makeRoute(request = assetRequest) {
  return { params: { request } };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PrepareVideoScreen = require('../PrepareVideoScreen').default;

function renderScreen(request = assetRequest) {
  return render(
    React.createElement(PrepareVideoScreen, {
      route: makeRoute(request),
      navigation: makeNavigation(),
    }),
  );
}

describe('PrepareVideoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('準備中表示を出しつつ request から VideoSource を準備する', async () => {
    mockRun.mockResolvedValue(mockSource);

    const { getByText } = renderScreen();

    expect(getByText('動画を準備中...')).toBeTruthy();

    await waitFor(() => {
      expect(mockRun).toHaveBeenCalledWith(assetRequest);
      expect(mockReplace).toHaveBeenCalledWith('Trim', { source: mockSource });
    });
  });

  it('準備失敗時はアラート表示後に goBack できる', async () => {
    mockRun.mockRejectedValue(new Error('unsupported'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    renderScreen();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'この動画は変換できません',
        expect.any(String),
        expect.any(Array),
      );
    });

    const buttons = alertSpy.mock.calls[0]?.[2] as { onPress?: () => void }[];
    buttons[0]?.onPress?.();
    expect(mockGoBack).toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
