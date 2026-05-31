import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@gif_to_note/review_prompt';

type ReviewPromptState = {
  conversionSuccessCount: number;
  hasAttemptedReviewPrompt: boolean;
};

const DEFAULT_STATE: ReviewPromptState = {
  conversionSuccessCount: 0,
  hasAttemptedReviewPrompt: false,
};

async function readState(): Promise<ReviewPromptState> {
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
        typeof data.hasAttemptedReviewPrompt === 'boolean' ? data.hasAttemptedReviewPrompt : false,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: ReviewPromptState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export interface UseReviewPromptResult {
  recordConversionSuccess: () => Promise<number>;
  shouldAttemptReviewPrompt: () => Promise<boolean>;
  markReviewPromptAttempted: () => Promise<void>;
}

export function useReviewPrompt(): UseReviewPromptResult {
  const recordConversionSuccess = useCallback(async (): Promise<number> => {
    const state = await readState();
    const nextCount = state.conversionSuccessCount + 1;

    await writeState({
      ...state,
      conversionSuccessCount: nextCount,
    });

    return nextCount;
  }, []);

  const shouldAttemptReviewPrompt = useCallback(async (): Promise<boolean> => {
    const state = await readState();
    return state.conversionSuccessCount >= 3 && !state.hasAttemptedReviewPrompt;
  }, []);

  const markReviewPromptAttempted = useCallback(async (): Promise<void> => {
    const state = await readState();
    await writeState({
      ...state,
      hasAttemptedReviewPrompt: true,
    });
  }, []);

  return {
    recordConversionSuccess,
    shouldAttemptReviewPrompt,
    markReviewPromptAttempted,
  };
}
