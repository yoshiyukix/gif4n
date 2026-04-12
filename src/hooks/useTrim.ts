import { useState, useCallback } from 'react';
import { TrimRange } from '../types';

export interface TrimState {
  trimRange: TrimRange;
  setStart: (value: number) => void;
  setEnd: (value: number) => void;
}

export function useTrim(durationSec: number): TrimState {
  const [trimRange, setTrimRange] = useState<TrimRange>({
    startSec: 0,
    endSec: durationSec,
  });

  const setStart = useCallback((value: number) => {
    setTrimRange((prev) => ({
      ...prev,
      startSec: Math.max(0, Math.min(value, prev.endSec)),
    }));
  }, []);

  const setEnd = useCallback(
    (value: number) => {
      setTrimRange((prev) => ({
        ...prev,
        endSec: Math.min(durationSec, Math.max(value, prev.startSec)),
      }));
    },
    [durationSec],
  );

  return { trimRange, setStart, setEnd };
}
