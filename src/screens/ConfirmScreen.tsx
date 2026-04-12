import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SizeEstimator } from '../usecases/SizeEstimator';
import { QUALITY_PRESETS } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirm'>;

const estimator = new SizeEstimator();

export default function ConfirmScreen({ route, navigation }: Props) {
  const { source, trimRange } = route.params;
  const durationSec = trimRange.endSec - trimRange.startSec;

  const estimatedMB = useMemo(() => {
    const preset = QUALITY_PRESETS[0];
    const bytes = estimator.estimateBytes(source, trimRange, preset);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [source, trimRange]);

  function handleStart() {
    navigation.navigate('Converting', { source, trimRange });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>変換設定確認</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoRow}>トリミング範囲: {durationSec.toFixed(1)} 秒</Text>
        <Text style={styles.infoRow}>推定 GIF サイズ（最高品質）: 〜{estimatedMB} MB</Text>
        <Text style={styles.note}>※ 10 MB を超える場合は自動的に品質を下げて再試行します</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>変換開始</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  infoBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  infoRow: { fontSize: 15, color: '#333' },
  note: { fontSize: 12, color: '#999', marginTop: 4 },
  button: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
