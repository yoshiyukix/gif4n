import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useConversion } from '../hooks/useConversion';
import { ConversionUseCase } from '../usecases/ConversionUseCase';
import { NativeGifService } from '../infrastructure/NativeGifService';
import { SizeEstimator } from '../usecases/SizeEstimator';
import { QUALITY_PRESETS } from '../types';
import { useSettings } from '../hooks/useSettings';
import CircularProgress from '../components/CircularProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'Converting'>;

async function outputSizeResolver(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

export default function ConvertingScreen({ route, navigation }: Props) {
  const { source, trimRange, thumbnailUri: initialThumbnailUri } = route.params;

  const nativeService = useMemo(() => new NativeGifService(), []);
  const estimator = useMemo(() => new SizeEstimator(), []);
  const useCase = useMemo(
    () => new ConversionUseCase(nativeService, estimator),
    [nativeService, estimator],
  );
  const { settings } = useSettings();
  const { job, start, cancel } = useConversion({
    useCase,
    outputSizeResolver,
    maxSizeBytes: settings.maxSizeMb * 1024 * 1024,
  });
  const started = useRef(false);

  const thumbnailUri = initialThumbnailUri;

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 円形プログレス */}
        <View style={styles.progressSection}>
          <CircularProgress progress={progress} size={220} />
        </View>

        {/* ステータステキスト */}
        <View style={styles.statusSection}>
          <Text style={styles.heading}>変換中...</Text>
          <Text style={styles.subHeading}>フレームを最適化しています...</Text>
          <View style={styles.chip}>
            <Ionicons name="flash" size={14} color="#2855E7" style={styles.chipIcon} />
            <Text style={styles.chipText}>高速エンコード実行中</Text>
          </View>
        </View>

        {/* ファイル情報カード */}
        <View style={styles.card}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.fileName}>出力設定</Text>
            <Text style={styles.fileMeta}>
              {job?.preset ? `${job.preset.width}px · ${job.preset.fps} fps` : '–'}
            </Text>
            {job?.preset &&
              (() => {
                const idx = QUALITY_PRESETS.findIndex(
                  (p) => p.width === job.preset.width && p.fps === job.preset.fps,
                );
                return idx >= 0 ? (
                  <Text style={styles.fileMeta}>
                    試行 {idx + 1} / {QUALITY_PRESETS.length}
                  </Text>
                ) : null;
              })()}
          </View>
        </View>

        <View style={styles.spacer} />

        {/* キャンセルボタン */}
        <TouchableOpacity style={styles.cancelButton} onPress={cancel} activeOpacity={0.8}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAECF4',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  progressSection: {
    marginTop: 40,
    marginBottom: 40,
  },
  statusSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1E2A',
  },
  subHeading: {
    fontSize: 15,
    color: '#737590',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DDE4F8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2855E7',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#D8DCF0',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1E2A',
  },
  fileMeta: {
    fontSize: 13,
    color: '#737590',
  },
  spacer: {
    flex: 1,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#CDD4EE',
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1E2A',
  },
});
