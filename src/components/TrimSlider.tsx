import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { TrimRange } from '../types';

interface Props {
  durationSec: number;
  trimRange: TrimRange;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrimSlider({ durationSec, trimRange, onStartChange, onEndChange }: Props) {
  // ドラッグ中の表示用ローカル state（親の state 更新による slider の引き戻しを防ぐ）
  const [localStart, setLocalStart] = useState(trimRange.startSec);
  const [localEnd, setLocalEnd] = useState(trimRange.endSec);

  // 外部から trimRange が変わったとき（useTrim のクランプ処理後など）に同期
  useEffect(() => {
    setLocalStart(trimRange.startSec);
  }, [trimRange.startSec]);
  useEffect(() => {
    setLocalEnd(trimRange.endSec);
  }, [trimRange.endSec]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>開始</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={durationSec}
          step={0.1}
          value={localStart}
          onValueChange={setLocalStart} // ドラッグ中はローカル state だけ更新
          onSlidingComplete={onStartChange} // 指を離したときに親へ通知
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#ccc"
        />
        <Text style={styles.time}>{formatTime(localStart)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>終了</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={durationSec}
          step={0.1}
          value={localEnd}
          onValueChange={setLocalEnd} // ドラッグ中はローカル state だけ更新
          onSlidingComplete={onEndChange} // 指を離したときに親へ通知
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#ccc"
        />
        <Text style={styles.time}>{formatTime(localEnd)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { width: 32, fontSize: 12, color: '#666' },
  slider: { flex: 1 },
  time: { width: 48, fontSize: 12, textAlign: 'right', color: '#333' },
});
