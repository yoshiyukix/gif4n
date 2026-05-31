import type { IReviewPromptStore } from '../infrastructure/ReviewPromptStore';
import type { IReviewPromptRequester } from '../infrastructure/StoreReviewRequester';

const REVIEW_PROMPT_THRESHOLD = 3;

export type NextFrameScheduler = (signal: AbortSignal) => Promise<void>;

export function waitForNextFrame(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    let frameId: number | null = requestAnimationFrame(() => {
      frameId = null;
      signal.removeEventListener('abort', onAbort);
      resolve();
    });

    function onAbort() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      signal.removeEventListener('abort', onAbort);
      resolve();
    }

    signal.addEventListener('abort', onAbort);
  });
}

export class ReviewPromptPolicyUseCase {
  constructor(
    private readonly store: IReviewPromptStore,
    private readonly requester: IReviewPromptRequester,
    private readonly nextFrame: NextFrameScheduler = waitForNextFrame,
  ) {}

  async handleConversionSuccess(signal: AbortSignal): Promise<void> {
    const state = await this.store.read();
    const nextState = {
      ...state,
      conversionSuccessCount: state.conversionSuccessCount + 1,
    };
    await this.store.write(nextState);

    if (
      nextState.conversionSuccessCount < REVIEW_PROMPT_THRESHOLD ||
      nextState.hasAttemptedReviewPrompt ||
      signal.aborted
    ) {
      return;
    }

    await this.nextFrame(signal);
    if (signal.aborted) return;

    try {
      await this.requester.requestReview();
    } catch {
      // レビュー UI の表示可否は OS 判断に委ね、失敗時も静かに握りつぶす
    } finally {
      await this.store.write({
        ...nextState,
        hasAttemptedReviewPrompt: true,
      });
    }
  }
}
