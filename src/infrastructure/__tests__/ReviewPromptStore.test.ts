import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageReviewPromptStore } from '../ReviewPromptStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
});

const STORAGE_KEY = '@gif_to_note/review_prompt';

describe('AsyncStorageReviewPromptStore', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('状態が未保存ならデフォルト値を返す', async () => {
    const store = new AsyncStorageReviewPromptStore();

    await expect(store.read()).resolves.toEqual({
      conversionSuccessCount: 0,
      hasAttemptedReviewPrompt: false,
    });
  });

  it('保存した状態を読み戻せる', async () => {
    const store = new AsyncStorageReviewPromptStore();
    const state = {
      conversionSuccessCount: 3,
      hasAttemptedReviewPrompt: true,
    };

    await store.write(state);

    await expect(store.read()).resolves.toEqual(state);
  });

  it('壊れた JSON ならデフォルト値に戻る', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'invalid json{{{');
    const store = new AsyncStorageReviewPromptStore();

    await expect(store.read()).resolves.toEqual({
      conversionSuccessCount: 0,
      hasAttemptedReviewPrompt: false,
    });
  });
});
