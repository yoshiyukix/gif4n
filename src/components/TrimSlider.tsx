import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Image, LayoutChangeEvent } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { TrimRange } from '../types';

const BLUE = '#1758F0';
const HANDLE_W = 28;
const THUMB_COUNT = 8;

interface Props {
  durationSec: number;
  trimRange: TrimRange;
  uri: string;
  currentTimeSec?: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onSeek?: (timeSec: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrimSlider({
  durationSec,
  trimRange,
  uri,
  currentTimeSec = 0,
  onStartChange,
  onEndChange,
  onDragStart,
  onDragEnd,
  onSeek,
  onSeekStart,
  onSeekEnd,
}: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const [thumbUris, setThumbUris] = useState<string[]>([]);
  const [localStart, setLocalStart] = useState(trimRange.startSec);
  const [localEnd, setLocalEnd] = useState(trimRange.endSec);

  // PanResponder ハンドラー内で参照する mutable refs
  const barWidthRef = useRef(0);
  const localStartRef = useRef(trimRange.startSec);
  const localEndRef = useRef(trimRange.endSec);
  const durationRef = useRef(durationSec);
  const onStartChangeRef = useRef(onStartChange);
  const onEndChangeRef = useRef(onEndChange);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const onSeekRef = useRef(onSeek);
  const onSeekStartRef = useRef(onSeekStart);
  const onSeekEndRef = useRef(onSeekEnd);
  const startDragRef = useRef(0);
  const endDragRef = useRef(0);
  const playheadDragStartRef = useRef(0);

  // ドラッグ中のプレイヘッド表示位置（null なら currentTimeSec prop を使用）
  const [localPlayheadSec, setLocalPlayheadSec] = useState<number | null>(null);
  const localPlayheadSecRef = useRef(currentTimeSec);

  useEffect(() => {
    durationRef.current = durationSec;
  }, [durationSec]);
  useEffect(() => {
    onStartChangeRef.current = onStartChange;
  }, [onStartChange]);
  useEffect(() => {
    onEndChangeRef.current = onEndChange;
  }, [onEndChange]);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);
  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);
  useEffect(() => {
    onSeekStartRef.current = onSeekStart;
  }, [onSeekStart]);
  useEffect(() => {
    onSeekEndRef.current = onSeekEnd;
  }, [onSeekEnd]);

  // ドラッグ中でないとき ref を currentTimeSec に追随させる
  useEffect(() => {
    if (localPlayheadSec === null) {
      localPlayheadSecRef.current = currentTimeSec;
    }
  }, [currentTimeSec, localPlayheadSec]);

  // 外部クランプ後の同期
  useEffect(() => {
    localStartRef.current = trimRange.startSec;
    setLocalStart(trimRange.startSec);
  }, [trimRange.startSec]);
  useEffect(() => {
    localEndRef.current = trimRange.endSec;
    setLocalEnd(trimRange.endSec);
  }, [trimRange.endSec]);

  // サムネイル生成
  useEffect(() => {
    if (!uri || durationSec <= 0) return;
    let cancelled = false;
    (async () => {
      const uris: string[] = [];
      for (let i = 0; i < THUMB_COUNT; i++) {
        const timeSec = (durationSec / (THUMB_COUNT - 1)) * i;
        try {
          const { uri: tUri } = await VideoThumbnails.getThumbnailAsync(uri, {
            time: Math.floor(timeSec * 1000),
          });
          if (!cancelled) uris.push(tUri);
        } catch {
          if (!cancelled) uris.push('');
        }
      }
      if (!cancelled) setThumbUris(uris);
    })();
    return () => {
      cancelled = true;
    };
  }, [uri, durationSec]);

  function secToPx(sec: number): number {
    if (barWidth <= 0 || durationSec <= 0) return 0;
    return (sec / durationSec) * barWidth;
  }

  // 左ハンドル（useRef で一度だけ生成 → stale closure を回避）
  const startPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startDragRef.current = localStartRef.current;
        onDragStartRef.current?.();
      },
      onPanResponderMove: (_, gs) => {
        const bw = barWidthRef.current;
        const dur = durationRef.current;
        if (bw <= 0 || dur <= 0) return;
        const deltaSec = (gs.dx / bw) * dur;
        const newSec = Math.max(
          0,
          Math.min(startDragRef.current + deltaSec, localEndRef.current - 0.1),
        );
        localStartRef.current = newSec;
        setLocalStart(newSec);
      },
      onPanResponderRelease: () => {
        onStartChangeRef.current(localStartRef.current);
        onDragEndRef.current?.();
      },
    }),
  ).current;

  // 右ハンドル
  const endPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        endDragRef.current = localEndRef.current;
        onDragStartRef.current?.();
      },
      onPanResponderMove: (_, gs) => {
        const bw = barWidthRef.current;
        const dur = durationRef.current;
        if (bw <= 0 || dur <= 0) return;
        const deltaSec = (gs.dx / bw) * dur;
        const newSec = Math.min(
          dur,
          Math.max(endDragRef.current + deltaSec, localStartRef.current + 0.1),
        );
        localEndRef.current = newSec;
        setLocalEnd(newSec);
      },
      onPanResponderRelease: () => {
        onEndChangeRef.current(localEndRef.current);
        onDragEndRef.current?.();
      },
    }),
  ).current;

  function onBarLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    barWidthRef.current = w;
    setBarWidth(w);
  }

  // プレイヘッド PanResponder
  const playheadPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        playheadDragStartRef.current = localPlayheadSecRef.current;
        onDragStartRef.current?.();
        onSeekStartRef.current?.();
      },
      onPanResponderMove: (_, gs) => {
        const bw = barWidthRef.current;
        const dur = durationRef.current;
        if (bw <= 0 || dur <= 0) return;
        const deltaSec = (gs.dx / bw) * dur;
        const newSec = Math.max(0, Math.min(dur, playheadDragStartRef.current + deltaSec));
        localPlayheadSecRef.current = newSec;
        setLocalPlayheadSec(newSec);
        onSeekRef.current?.(newSec);
      },
      onPanResponderRelease: () => {
        onSeekRef.current?.(localPlayheadSecRef.current);
        setLocalPlayheadSec(null);
        onDragEndRef.current?.();
        onSeekEndRef.current?.();
      },
    }),
  ).current;

  const startX = secToPx(localStart);
  const endX = secToPx(localEnd);
  const displayPlayheadSec = localPlayheadSec !== null ? localPlayheadSec : currentTimeSec;
  const playheadX = secToPx(displayPlayheadSec);

  return (
    <View style={styles.wrapper}>
      {/*
        barOuter: overflow visible → ハンドルが見切れない
        barInner: overflow hidden  → サムネイル・マスクをクリップ
      */}
      <View style={styles.barOuter} onLayout={onBarLayout}>
        {/* サムネイル + マスク + ハイライト（overflow hidden の内側） */}
        <View style={styles.barInner}>
          <View style={styles.thumbnailRow}>
            {thumbUris.length > 0
              ? thumbUris.map((t, i) => (
                  <View key={i} style={styles.thumbCell}>
                    {t ? (
                      <Image
                        source={{ uri: t }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#C7C7CC' }]} />
                    )}
                  </View>
                ))
              : Array.from({ length: THUMB_COUNT }).map((_, i) => (
                  <View key={i} style={[styles.thumbCell, { backgroundColor: '#C7C7CC' }]} />
                ))}
          </View>

          {/* 選択範囲外を半透明でマスク */}
          {barWidth > 0 && (
            <>
              <View style={[styles.mask, { left: 0, width: startX }]} />
              <View style={[styles.mask, { left: endX, right: 0 }]} />
            </>
          )}

          {/* 選択範囲ハイライト枠 */}
          {barWidth > 0 && (
            <View
              style={[styles.rangeHighlight, { left: startX, width: Math.max(0, endX - startX) }]}
            />
          )}

          {/* プレイヘッド（barInner 内の視覚的な線） */}
          {barWidth > 0 && <View style={[styles.playheadLine, { left: playheadX }]} />}
        </View>

        {/* プレイヘッドのドラッグハンドル（barOuter に配置 → 見切れなし） */}
        {barWidth > 0 && (
          <View
            {...playheadPan.panHandlers}
            style={[styles.playheadHandle, { left: playheadX - PLAYHEAD_HIT_W / 2 }]}
          >
            {/* 上部の三角マーカー */}
            <View style={styles.playheadTriangle} />
          </View>
        )}

        {/* ハンドル（barOuter の絶対配置 → overflow hidden の制約外） */}
        {barWidth > 0 && (
          <View
            {...startPan.panHandlers}
            style={[styles.handle, styles.handleLeft, { left: startX }]}
          >
            <Text style={styles.handleIcon}>⠿</Text>
          </View>
        )}

        {barWidth > 0 && (
          <View
            {...endPan.panHandlers}
            style={[styles.handle, styles.handleRight, { left: endX - HANDLE_W }]}
          >
            <Text style={styles.handleIcon}>⠿</Text>
          </View>
        )}
      </View>

      {/* 時刻ラベル */}
      <View style={styles.labels}>
        <Text style={styles.labelText}>{formatTime(0)}</Text>
        <Text style={styles.labelText}>{formatTime(durationSec)}</Text>
      </View>
    </View>
  );
}

const THUMB_HEIGHT = 56;
const PLAYHEAD_HIT_W = 32;

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingVertical: 4 },
  // ハンドルが見切れないよう overflow は指定しない
  barOuter: {
    height: THUMB_HEIGHT,
  },
  // サムネイル・マスクをここでクリップ
  barInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumbnailRow: {
    flexDirection: 'row',
    height: THUMB_HEIGHT,
  },
  thumbCell: {
    flex: 1,
    height: THUMB_HEIGHT,
    overflow: 'hidden',
  },
  mask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  rangeHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2.5,
    borderColor: BLUE,
    borderRadius: 4,
  },
  playheadLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF2D55',
    marginLeft: -1,
  },
  playheadHandle: {
    position: 'absolute',
    top: -10,
    bottom: -4,
    width: PLAYHEAD_HIT_W,
    alignItems: 'center',
    zIndex: 15,
  },
  playheadTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF2D55',
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_W,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  handleLeft: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  handleRight: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  handleIcon: { color: '#fff', fontSize: 14 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  labelText: { fontSize: 12, color: '#8E8E93' },
});
