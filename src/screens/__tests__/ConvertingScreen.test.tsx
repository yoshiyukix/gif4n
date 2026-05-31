import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ConversionJob, QUALITY_PRESETS } from '../../types';
import { useConversionSession } from '../../hooks/useConversionSession';
import { useSettings } from '../../hooks/useSettings';

// ─── モック ──────────────────────────────────────────────────────

const mockStart = jest.fn();
const mockCancel = jest.fn();
let mockJob: ConversionJob | null = null;

const mockSettings = { maxSizeMb: 10 };
let mockIsLoaded = true;

jest.mock('../../hooks/useConversionSession', () => ({
  useConversionSession: jest.fn(),
}));
jest.mock('../../hooks/useSettings', () => ({
  useSettings: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../components/CircularProgress', () => 'CircularProgress');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseConversionSession = useConversionSession as jest.Mock;
const mockUseSettings = useSettings as jest.Mock;

// ─── テスト用フィクスチャ ─────────────────────────────────────────

const mockSource = {
  uri: 'file:///tmp/input.mp4',
  durationSec: 10,
  width: 1280,
  height: 720,
  fileSizeBytes: 5_000_000,
};

const mockTrimRange = { startSec: 0, endSec: 5 };

const mockReplace = jest.fn();
const mockGoBack = jest.fn();

function makeNavigation() {
  return {
    replace: mockReplace,
    goBack: mockGoBack,
  };
}

function makeRouteParams(overrides: Record<string, unknown> = {}) {
  return {
    params: {
      source: mockSource,
      trimRange: mockTrimRange,
      thumbnailUri: null,
      ...overrides,
    },
  };
}

// ConvertingScreen を遅延インポート（モックセットアップ後）
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ConvertingScreen = require('../ConvertingScreen').default;

function renderScreen(job: ConversionJob | null = null) {
  mockJob = job;
  mockUseConversionSession.mockReturnValue({
    job: mockJob,
    start: mockStart,
    cancel: mockCancel,
  });
  mockUseSettings.mockReturnValue({
    settings: mockSettings,
    isLoaded: mockIsLoaded,
  });

  return render(
    React.createElement(ConvertingScreen, {
      route: makeRouteParams(),
      navigation: makeNavigation(),
    }),
  );
}

// ─── テストスイート ───────────────────────────────────────────────

describe('ConvertingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoaded = true;
    mockJob = null;
  });

  it('isLoaded=true のとき start(source, trimRange) が引数 2 つで呼ばれる', async () => {
    renderScreen(null);

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockStart).toHaveBeenCalledWith(mockSource, mockTrimRange);
    });
  });

  it('isLoaded=false のとき start は呼ばれない', () => {
    mockIsLoaded = false;
    renderScreen(null);

    expect(mockStart).not.toHaveBeenCalled();
  });

  it('job.status === "piloting" のとき「推定中...」が表示される', () => {
    const pilotingJob: ConversionJob = {
      source: mockSource,
      trim: mockTrimRange,
      preset: QUALITY_PRESETS[0],
      status: 'piloting',
      progressRate: 0,
      outputUri: null,
      outputSizeBytes: null,
    };

    const { getByText } = renderScreen(pilotingJob);

    expect(getByText('推定中...')).toBeTruthy();
  });

  it('job.status === "piloting" のときキャンセルボタンで cancel() が呼ばれる', () => {
    const pilotingJob: ConversionJob = {
      source: mockSource,
      trim: mockTrimRange,
      preset: QUALITY_PRESETS[0],
      status: 'piloting',
      progressRate: 0,
      outputUri: null,
      outputSizeBytes: null,
    };

    const { getByText } = renderScreen(pilotingJob);
    fireEvent.press(getByText('キャンセル'));

    expect(mockCancel).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('job.status === "done" のとき navigation.replace("Result", ...) が呼ばれる', async () => {
    const doneJob: ConversionJob = {
      source: mockSource,
      trim: mockTrimRange,
      preset: QUALITY_PRESETS[0],
      status: 'done',
      progressRate: 1.0,
      outputUri: 'file:///tmp/out.gif',
      outputSizeBytes: 1_000_000,
    };

    renderScreen(doneJob);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Result', {
        gifUri: 'file:///tmp/out.gif',
        sizeBytes: 1_000_000,
        preset: QUALITY_PRESETS[0],
      });
    });
  });

  it('job.status === "cancelled" のとき navigation.goBack() が呼ばれる', async () => {
    const cancelledJob: ConversionJob = {
      source: mockSource,
      trim: mockTrimRange,
      preset: QUALITY_PRESETS[0],
      status: 'cancelled',
      progressRate: 0,
      outputUri: null,
      outputSizeBytes: null,
    };

    renderScreen(cancelledJob);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('job.status === "error"（too_large）のとき Alert.alert("動画が長すぎます", ...) が表示される', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const errorJob: ConversionJob = {
      source: mockSource,
      trim: mockTrimRange,
      preset: QUALITY_PRESETS[5],
      status: 'error',
      progressRate: 0,
      outputUri: null,
      outputSizeBytes: null,
      errorReason: 'too_large',
      errorMessage: '全品質設定で 10MB を超えました。',
    };

    renderScreen(errorJob);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '動画が長すぎます',
        expect.any(String),
        expect.any(Array),
      );
    });
    alertSpy.mockRestore();
  });

  it('job.status === "error"（native_error）のとき Alert.alert("変換エラー", ...) が表示される', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const errorJob: ConversionJob = {
      source: mockSource,
      trim: mockTrimRange,
      preset: QUALITY_PRESETS[0],
      status: 'error',
      progressRate: 0,
      outputUri: null,
      outputSizeBytes: null,
      errorReason: 'native_error',
      errorMessage: 'ネイティブエラーが発生しました',
    };

    renderScreen(errorJob);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('変換エラー', expect.any(String), expect.any(Array));
    });
    alertSpy.mockRestore();
  });

  it('ジョブ未開始時のキャンセルボタン押下で navigation.goBack() が呼ばれる', () => {
    const { getByText } = renderScreen(null);
    fireEvent.press(getByText('キャンセル'));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('job.status === "running" のときキャンセルボタン押下で cancel() が呼ばれる', () => {
    const runningJob: ConversionJob = {
      source: mockSource,
      trim: mockTrimRange,
      preset: QUALITY_PRESETS[0],
      status: 'running',
      progressRate: 0.3,
      outputUri: null,
      outputSizeBytes: null,
    };

    const { getByText } = renderScreen(runningJob);
    fireEvent.press(getByText('キャンセル'));

    expect(mockCancel).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
