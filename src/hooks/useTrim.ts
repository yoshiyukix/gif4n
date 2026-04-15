import { useState, useCallback } from 'react';
import { TrimRange } from '../types';

export const MAX_TRIM_DURATION_SEC = 15;

export interface TrimState {
  trimRange: TrimRange;
  setStart: (value: number) => void;
  setEnd: (value: number) => void;
}

export function useTrim(durationSec: number): TrimState {
  const [trimRange, setTrimRange] = useState<TrimRange>({
    startSec: 0,
    endSec: Math.min(durationSec, MAX_TRIM_DURATION_SEC),
  });

  const setStart = useCallback((value: number) => {
    setTrimRange((prev) => {
      const newStart = Math.max(0, Math.min(value, prev.endSec));
      if (prev.endSec - newStart > MAX_TRIM_DURATION_SEC) {
        return { startSec: newStart, endSec: newStart + MAX_TRIM_DURATION_SEC };
      }
      return { startSec: newStart, endSec: prev.endSec };
    });
  }, []);

  const setEnd = useCallback(
    (value: number) => {
      setTrimRange((prev) => {
        const newEnd = Math.min(durationSec, Math.max(value, prev.startSec));
        if (newEnd - prev.startSec > MAX_TRIM_DURATION_SEC) {
          return { startSec: Math.max(0, newEnd - MAX_TRIM_DURATION_SEC), endSec: newEnd };
        }
        return { startSec: prev.startSec, endSec: newEnd };
      });
    },
    [durationSec],
  );

  return { trimRange, setStart, setEnd };
}
