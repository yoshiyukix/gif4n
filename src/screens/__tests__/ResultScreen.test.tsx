import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as StoreReview from 'expo-store-review';
import { useReviewPrompt } from '../../hooks/useReviewPrompt';

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

jest.mock('../../hooks/useReviewPrompt', () => ({
  useReviewPrompt: jest.fn(),
}));

jest.mock('../../components/GifPreview', () => ({ GifPreview: 'GifPreview' }));
jest.mock('../../components/SaveToast', () => ({ SaveToast: 'SaveToast' }));
jest.mock('../../hooks/useMediaActions', () => ({
  useMediaActions: jest.fn(() => ({
    isSaving: false,
    saveGif: jest.fn(),
    shareGif: jest.fn(),
  })),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0 }),
}));

const mockRecordConversionSuccess = jest.fn();
const mockShouldAttemptReviewPrompt = jest.fn();
const mockMarkReviewPromptAttempted = jest.fn();
const mockPop = jest.fn();
const mockPopToTop = jest.fn();

const mockUseReviewPrompt = useReviewPrompt as jest.MockedFunction<typeof useReviewPrompt>;

function makeNavigation() {
  return {
    pop: mockPop,
    popToTop: mockPopToTop,
  };
}

function makeRoute() {
  return {
    params: {
      gifUri: 'file:///tmp/output.gif',
      sizeBytes: 1_000_000,
      preset: { width: 620 as const, fps: 15 as const },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ResultScreen = require('../ResultScreen').default;

describe('ResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });
    mockRecordConversionSuccess.mockResolvedValue(undefined);
    mockShouldAttemptReviewPrompt.mockResolvedValue(false);
    mockMarkReviewPromptAttempted.mockResolvedValue(undefined);
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    mockUseReviewPrompt.mockReturnValue({
      recordConversionSuccess: mockRecordConversionSuccess,
      shouldAttemptReviewPrompt: mockShouldAttemptReviewPrompt,
      markReviewPromptAttempted: mockMarkReviewPromptAttempted,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('レビュー条件未達のとき、ResultScreen 表示後も requestReview しない', async () => {
    render(
      React.createElement(ResultScreen, {
        route: makeRoute(),
        navigation: makeNavigation(),
      }),
    );

    await waitFor(() => {
      expect(mockRecordConversionSuccess).toHaveBeenCalledTimes(1);
      expect(mockShouldAttemptReviewPrompt).toHaveBeenCalledTimes(1);
    });

    expect(StoreReview.requestReview).not.toHaveBeenCalled();
    expect(mockMarkReviewPromptAttempted).not.toHaveBeenCalled();
  });

  it('レビュー条件を満たすと、初回描画後の次フレームで requestReview し試行済みにする', async () => {
    mockShouldAttemptReviewPrompt.mockResolvedValue(true);

    render(
      React.createElement(ResultScreen, {
        route: makeRoute(),
        navigation: makeNavigation(),
      }),
    );

    await waitFor(() => {
      expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
      expect(mockMarkReviewPromptAttempted).toHaveBeenCalledTimes(1);
    });
  });

  it('requestReview が失敗しても試行済みにする', async () => {
    mockShouldAttemptReviewPrompt.mockResolvedValue(true);
    (StoreReview.requestReview as jest.Mock).mockRejectedValue(new Error('review failed'));

    render(
      React.createElement(ResultScreen, {
        route: makeRoute(),
        navigation: makeNavigation(),
      }),
    );

    await waitFor(() => {
      expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
      expect(mockMarkReviewPromptAttempted).toHaveBeenCalledTimes(1);
    });
  });

  it('レビュー UI が利用できない環境では requestReview せず試行済みにする', async () => {
    mockShouldAttemptReviewPrompt.mockResolvedValue(true);
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    render(
      React.createElement(ResultScreen, {
        route: makeRoute(),
        navigation: makeNavigation(),
      }),
    );

    await waitFor(() => {
      expect(StoreReview.requestReview).not.toHaveBeenCalled();
      expect(mockMarkReviewPromptAttempted).toHaveBeenCalledTimes(1);
    });
  });
});
