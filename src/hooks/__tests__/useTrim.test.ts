import { renderHook, act } from '@testing-library/react-native';
import { useTrim } from '../useTrim';
import { TrimRange } from '../../types';

describe('useTrim', () => {
  it('初期値は { startSec: 0, endSec: durationSec }', () => {
    const { result } = renderHook(() => useTrim(60));
    expect(result.current.trimRange).toEqual<TrimRange>({ startSec: 0, endSec: 60 });
  });

  it('setStart で startSec が更新される', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => { result.current.setStart(10); });
    expect(result.current.trimRange.startSec).toBe(10);
  });

  it('setEnd で endSec が更新される', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => { result.current.setEnd(50); });
    expect(result.current.trimRange.endSec).toBe(50);
  });

  it('setStart に 0 未満を渡すと 0 にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => { result.current.setStart(-5); });
    expect(result.current.trimRange.startSec).toBe(0);
  });

  it('setStart に endSec を超える値を渡すと endSec にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => { result.current.setEnd(30); });
    act(() => { result.current.setStart(40); });
    expect(result.current.trimRange.startSec).toBe(30);
  });

  it('setEnd に durationSec を超える値を渡すと durationSec にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => { result.current.setEnd(100); });
    expect(result.current.trimRange.endSec).toBe(60);
  });

  it('setEnd に startSec 未満を渡すと startSec にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => { result.current.setStart(20); });
    act(() => { result.current.setEnd(10); });
    expect(result.current.trimRange.endSec).toBe(20);
  });
});
