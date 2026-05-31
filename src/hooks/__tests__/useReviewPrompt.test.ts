import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReviewPrompt } from '../useReviewPrompt';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
});

const STORAGE_KEY = '@gif_to_note/review_prompt';

describe('useReviewPrompt', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('変換成功回数が 3 回未満の間はレビュー試行条件を満たさない', async () => {
    const { result } = renderHook(() => useReviewPrompt());

    await act(async () => {
      await result.current.recordConversionSuccess();
      await result.current.recordConversionSuccess();
    });

    await expect(result.current.shouldAttemptReviewPrompt()).resolves.toBe(false);
  });

  it('3 回目の変換成功後、未試行ならレビュー試行条件を満たす', async () => {
    const { result } = renderHook(() => useReviewPrompt());

    await act(async () => {
      await result.current.recordConversionSuccess();
      await result.current.recordConversionSuccess();
      await result.current.recordConversionSuccess();
    });

    await expect(result.current.shouldAttemptReviewPrompt()).resolves.toBe(true);
  });

  it('レビュー試行済みなら、以後はレビュー試行条件を満たさない', async () => {
    const { result } = renderHook(() => useReviewPrompt());

    await act(async () => {
      await result.current.recordConversionSuccess();
      await result.current.recordConversionSuccess();
      await result.current.recordConversionSuccess();
      await result.current.markReviewPromptAttempted();
    });

    await expect(result.current.shouldAttemptReviewPrompt()).resolves.toBe(false);
  });

  it('永続状態が壊れていてもデフォルト状態に復帰する', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'invalid json{{{');

    const { result } = renderHook(() => useReviewPrompt());

    await expect(result.current.shouldAttemptReviewPrompt()).resolves.toBe(false);

    await act(async () => {
      const count = await result.current.recordConversionSuccess();
      expect(count).toBe(1);
    });
  });
});
