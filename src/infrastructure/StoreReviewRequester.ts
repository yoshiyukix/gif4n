import * as StoreReview from 'expo-store-review';

export interface IReviewPromptRequester {
  requestReview(): Promise<void>;
}

export class StoreReviewRequester implements IReviewPromptRequester {
  async requestReview(): Promise<void> {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;
    await StoreReview.requestReview();
  }
}
