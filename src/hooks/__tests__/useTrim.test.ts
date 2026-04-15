import { renderHook, act } from '@testing-library/react-native';
import { useTrim, MAX_TRIM_DURATION_SEC } from '../useTrim';
import { TrimRange } from '../../types';

describe('useTrim', () => {
  it('初期値: durationSec が MAX_TRIM_DURATION_SEC より長い場合は endSec = MAX_TRIM_DURATION_SEC', () => {
    const { result } = renderHook(() => useTrim(60));
    expect(result.current.trimRange).toEqual<TrimRange>({
      startSec: 0,
      endSec: MAX_TRIM_DURATION_SEC,
    });
  });

  it('初期値: durationSec が MAX_TRIM_DURATION_SEC 以下の場合は全体を選択', () => {
    const { result } = renderHook(() => useTrim(10));
    expect(result.current.trimRange).toEqual<TrimRange>({ startSec: 0, endSec: 10 });
  });

  it('setStart で startSec が更新される', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => {
      result.current.setStart(10);
    });
    expect(result.current.trimRange.startSec).toBe(10);
  });

  it('setEnd で endSec が更新される', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => {
      result.current.setEnd(50);
    });
    expect(result.current.trimRange.endSec).toBe(50);
  });

  it('setStart に 0 未満を渡すと 0 にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => {
      result.current.setStart(-5);
    });
    expect(result.current.trimRange.startSec).toBe(0);
  });

  it('setStart に endSec を超える値を渡すと endSec にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => {
      result.current.setEnd(30);
    });
    act(() => {
      result.current.setStart(40);
    });
    expect(result.current.trimRange.startSec).toBe(30);
  });

  it('setEnd に durationSec を超える値を渡すと durationSec にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    act(() => {
      result.current.setEnd(100);
    });
    expect(result.current.trimRange.endSec).toBe(60);
  });

  it('setEnd に startSec 未満を渡すと startSec にクランプされる', () => {
    const { result } = renderHook(() => useTrim(60));
    // endSec を先に 25 に移動して startSec=10 になる（連動） → startSec を 20 に上げる
    act(() => {
      result.current.setEnd(25);
    });
    act(() => {
      result.current.setStart(20);
    });
    act(() => {
      result.current.setEnd(10);
    });
    expect(result.current.trimRange.endSec).toBe(20);
  });

  it('setEnd で選択範囲が MAX_TRIM_DURATION_SEC を超えた場合、startSec を連動して縮める', () => {
    const { result } = renderHook(() => useTrim(60));
    // 初期: {start:0, end:15}。setEnd(20) → duration=20>15 → start=5
    act(() => {
      result.current.setEnd(20);
    });
    expect(result.current.trimRange).toEqual<TrimRange>({ startSec: 5, endSec: 20 });
  });

  it('setStart で選択範囲が MAX_TRIM_DURATION_SEC を超えた場合、endSec を連動して縮める', () => {
    const { result } = renderHook(() => useTrim(60));
    // 初期: {start:0, end:15}。まず end を 20 に伸ばす → start=5,end=20
    act(() => {
      result.current.setEnd(20);
    });
    // setStart(-2) → newStart=0, duration=20-0=20>15 → end=15
    act(() => {
      result.current.setStart(-2);
    });
    expect(result.current.trimRange).toEqual<TrimRange>({ startSec: 0, endSec: 15 });
  });
});
