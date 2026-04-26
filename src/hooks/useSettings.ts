import { useState, useEffect, useCallback, useRef } from 'react';
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

  // 最新の settings を同期するための ref。
  // updateSettings の useCallback 内から呼び出す際に最新値を参照するため、
  // setSettings updater の代わりにこの ref を使用する（updater 内での副作用を避けるため）。
  const settingsRef = useRef<AppSettings>(settings);
  settingsRef.current = settings;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          const VALID_MAX_SIZE_MB: readonly number[] = [6, 8, 10];
          const sanitized: Partial<AppSettings> = {};
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            const p = parsed as Record<string, unknown>;
            if (typeof p.maxSizeMb === 'number' && VALID_MAX_SIZE_MB.includes(p.maxSizeMb)) {
              sanitized.maxSizeMb = p.maxSizeMb as AppSettings['maxSizeMb'];
            }
          }
          setSettings({ ...DEFAULT_SETTINGS, ...sanitized });
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
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { settings, isLoaded, updateSettings };
}
