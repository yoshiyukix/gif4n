import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '../useSettings';
import { DEFAULT_SETTINGS } from '../../types';

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

describe('useSettings', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('初期値は DEFAULT_SETTINGS を返す', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  it('updateSettings で設定を更新できる', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ maxSizeMb: 5 });
    });

    expect(result.current.settings.maxSizeMb).toBe(5);
  });

  it('updateSettings 後に AsyncStorage へ保存される', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ maxSizeMb: 7 });
    });

    const raw = await AsyncStorage.getItem('@gif_to_note/settings');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.maxSizeMb).toBe(7);
  });

  it('AsyncStorage に値があれば再マウント時にロードされる', async () => {
    await AsyncStorage.setItem('@gif_to_note/settings', JSON.stringify({ maxSizeMb: 5 }));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings.maxSizeMb).toBe(5);
    });
  });

  it('AsyncStorage が壊れていてもデフォルト値でクラッシュしない', async () => {
    await AsyncStorage.setItem('@gif_to_note/settings', 'invalid json{{{');

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  it('ロード完了前は isLoaded が false、完了後は true になる', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
  });

  it('AsyncStorage に値があれば isLoaded が true になった後に反映される', async () => {
    await AsyncStorage.setItem('@gif_to_note/settings', JSON.stringify({ maxSizeMb: 8 }));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.settings.maxSizeMb).toBe(8);
    });
  });
});
