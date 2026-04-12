import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { TrimRange } from '../types';

interface Props {
  uri: string;
  trimRange: TrimRange;
}

export function VideoPreview({ uri, trimRange }: Props) {
  const trimRangeRef = useRef(trimRange);
  useEffect(() => {
    trimRangeRef.current = trimRange;
  });

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  // 開始位置が変わったら再生位置をリセット
  useEffect(() => {
    player.currentTime = trimRange.startSec;
  }, [trimRange.startSec, player]);

  // 終端に達したら開始位置に戻してループ
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const { startSec, endSec } = trimRangeRef.current;
    if (currentTime >= endSec) {
      player.currentTime = startSec;
    }
  });

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  video: { flex: 1 },
});
