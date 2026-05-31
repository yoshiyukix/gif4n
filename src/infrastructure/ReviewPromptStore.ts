import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@gif_to_note/review_prompt';

export type ReviewPromptState = {
  conversionSuccessCount: number;
  hasAttemptedReviewPrompt: boolean;
};

const DEFAULT_STATE: ReviewPromptState = {
  conversionSuccessCount: 0,
  hasAttemptedReviewPrompt: false,
};

export interface IReviewPromptStore {
  read(): Promise<ReviewPromptState>;
  write(state: ReviewPromptState): Promise<void>;
}

export class AsyncStorageReviewPromptStore implements IReviewPromptStore {
  async read(): Promise<ReviewPromptState> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return DEFAULT_STATE;
      }

      const data = parsed as Record<string, unknown>;
      return {
        conversionSuccessCount:
          typeof data.conversionSuccessCount === 'number' ? data.conversionSuccessCount : 0,
        hasAttemptedReviewPrompt:
          typeof data.hasAttemptedReviewPrompt === 'boolean'
            ? data.hasAttemptedReviewPrompt
            : false,
      };
    } catch {
      return DEFAULT_STATE;
    }
  }

  async write(state: ReviewPromptState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
