import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { TrimRange } from '../types';

interface Props {
  uri: string;
  trimRange: TrimRange;
}

export function VideoPreview({ uri, trimRange }: Props) {
  const videoRef = useRef<Video>(null);
  // ref に最新の trimRange を保持することでコールバック内の stale closure を防ぐ
  const trimRangeRef = useRef(trimRange);
  useEffect(() => {
    trimRangeRef.current = trimRange;
  });

  // 開始位置が変わったら再生位置をリセット
  useEffect(() => {
    videoRef.current?.setPositionAsync(trimRange.startSec * 1000);
  }, [trimRange.startSec]);

  const handlePlaybackStatusUpdate = useCallback(async (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const { startSec, endSec } = trimRangeRef.current;
    // 終端に達したら開始位置に戻してループ
    if (status.positionMillis >= endSec * 1000) {
      await videoRef.current?.setPositionAsync(startSec * 1000);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  video: { flex: 1 },
});
