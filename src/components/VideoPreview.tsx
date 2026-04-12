import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { TrimRange } from '../types';

interface Props {
  uri: string;
  trimRange: TrimRange;
  playbackSpeed?: number;
  loop?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  seekTo?: number;
  externalPaused?: boolean;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoPreview({ uri, trimRange, playbackSpeed = 1, loop = true, onTimeUpdate, seekTo, externalPaused }: Props) {
  const trimRangeRef = useRef(trimRange);
  const seekToRef = useRef(seekTo);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(trimRange.startSec);

  useEffect(() => {
    trimRangeRef.current = trimRange;
  });

  useEffect(() => {
    seekToRef.current = seekTo;
  }, [seekTo]);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
    p.playbackRate = playbackSpeed;
    p.timeUpdateEventInterval = 0.1; // 100ms 間隔でトリム範囲を正確に検知
    p.currentTime = trimRangeRef.current.startSec; // 開始位置から再生
    p.play();
  });

  // 開始位置が変わったら再生位置をリセット
  useEffect(() => {
    player.currentTime = trimRange.startSec;
    setCurrentTimeSec(trimRange.startSec);
  }, [trimRange.startSec, player]);

  // 再生速度が変わったら反映
  useEffect(() => {
    player.playbackRate = playbackSpeed;
  }, [playbackSpeed, player]);

  // seekTo が変わったらシーク
  useEffect(() => {
    if (seekTo !== undefined) {
      player.currentTime = seekTo;
    }
  }, [seekTo, player]);

  // externalPaused で一時停止 / 再開
  // false に変わったとき seekTo の位置から確実に再生開始する
  useEffect(() => {
    if (externalPaused) {
      player.pause();
      setIsPlaying(false);
    } else if (externalPaused === false) {
      if (seekToRef.current !== undefined) {
        player.currentTime = seekToRef.current;
      }
      player.play();
      setIsPlaying(true);
    }
  }, [externalPaused, player]);

  // 終端に達したらループ or 停止
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setCurrentTimeSec(currentTime);
    onTimeUpdate?.(currentTime);
    const { startSec, endSec } = trimRangeRef.current;
    if (currentTime >= endSec) {
      if (loop) {
        player.currentTime = startSec;
      } else {
        player.pause();
        setIsPlaying(false);
      }
    }
  });

  function handleTap() {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      if (player.currentTime >= trimRangeRef.current.endSec) {
        player.currentTime = trimRangeRef.current.startSec;
      }
      player.play();
      setIsPlaying(true);
    }
  }

  const durationSec = trimRange.endSec - trimRange.startSec;

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
      {/* タップオーバーレイ */}
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleTap} activeOpacity={1}>
        {!isPlaying && (
          <View style={styles.playButton}>
            <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
          </View>
        )}
      </TouchableOpacity>
      {/* 右下の時刻表示 */}
      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>
          {formatTime(Math.max(0, currentTimeSec - trimRange.startSec))} / {formatTime(durationSec)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: { flex: 1 },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    marginTop: -32,
    marginLeft: -32,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
