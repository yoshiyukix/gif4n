import { useState, useEffect, useRef } from 'react';
import { VideoSource } from '../types';
import { IPilotEstimationUseCase } from '../usecases/PilotEstimationUseCase';

export interface UsePilotEstimationResult {
  /** パイロット変換で実測した 1 秒あたりのバイト数。完了前または失敗時は null */
  bytesPerSec: number | null;
  /** パイロット変換が完了（成功・失敗問わず）したら true */
  isPilotDone: boolean;
}

/**
 * マウント時にパイロット変換を開始し、1 秒あたりのバイト数を返す hook。
 * アンマウット時に変換を自動キャンセルする。
 */
export function usePilotEstimation(
  source: VideoSource,
  useCase: IPilotEstimationUseCase,
): UsePilotEstimationResult {
  const [bytesPerSec, setBytesPerSec] = useState<number | null>(null);
  const [isPilotDone, setIsPilotDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    abortRef.current = abort;

    useCase
      .run(source, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) {
          setBytesPerSec(result);
          setIsPilotDone(true);
        }
      })
      .catch(() => {
        // PilotEstimationUseCase.run() は内部で catch しているが、
        // 万が一 throw した場合でも Next を永久にブロックしないようにする
        if (!abort.signal.aborted) {
          setIsPilotDone(true);
        }
      });

    return () => {
      abort.abort();
    };
    // source と useCase はマウント時のみ実行（参照変更で再実行しない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { bytesPerSec, isPilotDone };
}
