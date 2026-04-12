import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import { useConversion } from '../hooks/useConversion';
import { ConversionUseCase } from '../usecases/ConversionUseCase';
import { NativeGifService } from '../infrastructure/NativeGifService';
import { SizeEstimator } from '../usecases/SizeEstimator';
import { MediaService } from '../infrastructure/MediaService';

type Props = NativeStackScreenProps<RootStackParamList, 'Converting'>;

async function outputSizeResolver(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

export default function ConvertingScreen({ route, navigation }: Props) {
  const { source, trimRange } = route.params;

  const nativeService = useMemo(() => new NativeGifService(), []);
  const estimator = useMemo(() => new SizeEstimator(), []);
  const useCase = useMemo(
    () => new ConversionUseCase(nativeService, estimator),
    [nativeService, estimator],
  );
  const media = useMemo(() => new MediaService(), []);

  const { job, start, cancel } = useConversion({ useCase, media, outputSizeResolver });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start(source, trimRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [errorShown, setErrorShown] = useState(false);

  // 完了・エラー・キャンセル時の画面遷移
  useEffect(() => {
    if (job?.status === 'done' && job.outputUri) {
      navigation.replace('Result', {
        gifUri: job.outputUri,
        sizeBytes: job.outputSizeBytes ?? 0,
        preset: job.preset,
      });
    }
    if (job?.status === 'cancelled') {
      navigation.goBack();
    }
    if (job?.status === 'error' && !errorShown) {
      setErrorShown(true);
      Alert.alert('変換エラー', job.errorMessage ?? '変換中にエラーが発生しました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
    // job.status の変化時のみ遷移処理を実行する（他フィールドの変化で重複実行させない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  const progress = job?.progressRate ?? 0;
  const percent = Math.round(progress * 100);

  function handleCancel() {
    cancel();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>変換中...</Text>
      <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.percent}>{percent}%</Text>
      {job?.preset && (
        <Text style={styles.presetText}>
          品質: {job.preset.width}px / {job.preset.fps}fps
        </Text>
      )}
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>キャンセル</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 32 },
  spinner: { marginBottom: 24 },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 4 },
  percent: { fontSize: 16, color: '#333', marginBottom: 4 },
  presetText: { fontSize: 12, color: '#999', marginBottom: 32 },
  cancelButton: { marginTop: 16 },
  cancelText: { color: '#FF3B30', fontSize: 16 },
});
