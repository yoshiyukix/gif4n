import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = '@gif_to_note/settings';

export interface UseSettingsResult {
  settings: AppSettings;
  isLoaded: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppSettings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      })
      .catch(() => {
        // 読み込み失敗時はデフォルト値を使用
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, isLoaded, updateSettings };
}
