import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ReviewPromptPolicyUseCase } from '../../usecases/ReviewPromptPolicyUseCase';

const mockHandleConversionSuccess = jest.fn();
const mockPop = jest.fn();
const mockPopToTop = jest.fn();

jest.mock('../../usecases/ReviewPromptPolicyUseCase', () => ({
  ReviewPromptPolicyUseCase: jest.fn().mockImplementation(() => ({
    handleConversionSuccess: mockHandleConversionSuccess,
  })),
}));
jest.mock('../../infrastructure/ReviewPromptStore', () => ({
  AsyncStorageReviewPromptStore: jest.fn(),
}));
jest.mock('../../infrastructure/StoreReviewRequester', () => ({
  StoreReviewRequester: jest.fn(),
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
    mockHandleConversionSuccess.mockResolvedValue(undefined);
  });

  it('表示時に Review Prompt policy へ変換成功を 1 回だけ通知する', async () => {
    render(
      React.createElement(ResultScreen, {
        route: makeRoute(),
        navigation: makeNavigation(),
      }),
    );

    await waitFor(() => {
      expect(ReviewPromptPolicyUseCase).toHaveBeenCalledTimes(1);
      expect(mockHandleConversionSuccess).toHaveBeenCalledTimes(1);
    });

    const signal = mockHandleConversionSuccess.mock.calls[0]?.[0] as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it('アンマウント時に進行中の Review Prompt policy を中断する', async () => {
    const { unmount } = render(
      React.createElement(ResultScreen, {
        route: makeRoute(),
        navigation: makeNavigation(),
      }),
    );

    await waitFor(() => {
      expect(mockHandleConversionSuccess).toHaveBeenCalledTimes(1);
    });

    const signal = mockHandleConversionSuccess.mock.calls[0]?.[0] as AbortSignal;
    unmount();

    expect(signal.aborted).toBe(true);
  });
});
