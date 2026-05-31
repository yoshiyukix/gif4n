import {
  ReviewPromptPolicyUseCase,
  waitForNextFrame,
  type NextFrameScheduler,
} from '../ReviewPromptPolicyUseCase';
import type { ReviewPromptState } from '../../infrastructure/ReviewPromptStore';

function makeAbortSignal(): AbortSignal {
  return new AbortController().signal;
}

describe('ReviewPromptPolicyUseCase', () => {
  it('3 回未満では Conversion Success Count だけを更新する', async () => {
    const writes: ReviewPromptState[] = [];
    const store = {
      read: jest.fn().mockResolvedValue({
        conversionSuccessCount: 1,
        hasAttemptedReviewPrompt: false,
      }),
      write: jest.fn().mockImplementation(async (state: ReviewPromptState) => {
        writes.push(state);
      }),
    };
    const requester = { requestReview: jest.fn() };
    const nextFrame: NextFrameScheduler = jest.fn().mockResolvedValue(undefined);

    const useCase = new ReviewPromptPolicyUseCase(store, requester, nextFrame);
    await useCase.handleConversionSuccess(makeAbortSignal());

    expect(store.write).toHaveBeenCalledTimes(1);
    expect(writes[0]).toEqual({
      conversionSuccessCount: 2,
      hasAttemptedReviewPrompt: false,
    });
    expect(nextFrame).not.toHaveBeenCalled();
    expect(requester.requestReview).not.toHaveBeenCalled();
  });

  it('3 回目で未試行なら次フレーム後にレビュー依頼し試行済みにする', async () => {
    const writes: ReviewPromptState[] = [];
    const store = {
      read: jest.fn().mockResolvedValue({
        conversionSuccessCount: 2,
        hasAttemptedReviewPrompt: false,
      }),
      write: jest.fn().mockImplementation(async (state: ReviewPromptState) => {
        writes.push(state);
      }),
    };
    const requester = { requestReview: jest.fn().mockResolvedValue(undefined) };
    const nextFrame: NextFrameScheduler = jest.fn().mockResolvedValue(undefined);

    const useCase = new ReviewPromptPolicyUseCase(store, requester, nextFrame);
    await useCase.handleConversionSuccess(makeAbortSignal());

    expect(nextFrame).toHaveBeenCalledTimes(1);
    expect(requester.requestReview).toHaveBeenCalledTimes(1);
    expect(writes).toEqual([
      {
        conversionSuccessCount: 3,
        hasAttemptedReviewPrompt: false,
      },
      {
        conversionSuccessCount: 3,
        hasAttemptedReviewPrompt: true,
      },
    ]);
  });

  it('レビュー依頼が失敗しても Review Prompt Attempt を記録する', async () => {
    const writes: ReviewPromptState[] = [];
    const store = {
      read: jest.fn().mockResolvedValue({
        conversionSuccessCount: 2,
        hasAttemptedReviewPrompt: false,
      }),
      write: jest.fn().mockImplementation(async (state: ReviewPromptState) => {
        writes.push(state);
      }),
    };
    const requester = { requestReview: jest.fn().mockRejectedValue(new Error('review failed')) };

    const useCase = new ReviewPromptPolicyUseCase(store, requester, async () => {});
    await useCase.handleConversionSuccess(makeAbortSignal());

    expect(requester.requestReview).toHaveBeenCalledTimes(1);
    expect(writes[writes.length - 1]).toEqual({
      conversionSuccessCount: 3,
      hasAttemptedReviewPrompt: true,
    });
  });

  it('すでに試行済みならレビュー依頼しない', async () => {
    const store = {
      read: jest.fn().mockResolvedValue({
        conversionSuccessCount: 5,
        hasAttemptedReviewPrompt: true,
      }),
      write: jest.fn().mockResolvedValue(undefined),
    };
    const requester = { requestReview: jest.fn() };

    const useCase = new ReviewPromptPolicyUseCase(store, requester, async () => {});
    await useCase.handleConversionSuccess(makeAbortSignal());

    expect(store.write).toHaveBeenCalledTimes(1);
    expect(requester.requestReview).not.toHaveBeenCalled();
  });

  it('次フレーム待ちのあいだに中断されたら Review Prompt Attempt を記録しない', async () => {
    const writes: ReviewPromptState[] = [];
    const store = {
      read: jest.fn().mockResolvedValue({
        conversionSuccessCount: 2,
        hasAttemptedReviewPrompt: false,
      }),
      write: jest.fn().mockImplementation(async (state: ReviewPromptState) => {
        writes.push(state);
      }),
    };
    const requester = { requestReview: jest.fn() };
    const controller = new AbortController();
    const nextFrame: NextFrameScheduler = async () => {
      controller.abort();
    };

    const useCase = new ReviewPromptPolicyUseCase(store, requester, nextFrame);
    await useCase.handleConversionSuccess(controller.signal);

    expect(requester.requestReview).not.toHaveBeenCalled();
    expect(writes).toEqual([
      {
        conversionSuccessCount: 3,
        hasAttemptedReviewPrompt: false,
      },
    ]);
  });
});

describe('waitForNextFrame', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('次フレームで解決する', async () => {
    jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });

    await expect(waitForNextFrame(makeAbortSignal())).resolves.toBeUndefined();
  });

  it('abort 時は cancelAnimationFrame を呼んで解決する', async () => {
    const controller = new AbortController();
    const cancelSpy = jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 7);

    const promise = waitForNextFrame(controller.signal);
    controller.abort();

    await expect(promise).resolves.toBeUndefined();
    expect(cancelSpy).toHaveBeenCalledWith(7);
  });
});
