import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { VideoPreview } from '../components/VideoPreview';
import { TrimSlider } from '../components/TrimSlider';
import { useTrim } from '../hooks/useTrim';

type Props = NativeStackScreenProps<RootStackParamList, 'Trim'>;

const MIN_DURATION_SEC = 0.5;

export default function TrimScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const { trimRange, setStart, setEnd } = useTrim(source.durationSec || 60);

  function handleNext() {
    const duration = trimRange.endSec - trimRange.startSec;
    if (duration < MIN_DURATION_SEC) {
      Alert.alert('トリミングエラー', `最低 ${MIN_DURATION_SEC} 秒以上を選択してください。`);
      return;
    }
    navigation.navigate('Confirm', { source, trimRange });
  }

  return (
    <View style={styles.container}>
      <VideoPreview uri={source.uri} trimRange={trimRange} />
      <TrimSlider
        durationSec={source.durationSec || 60}
        trimRange={trimRange}
        onStartChange={setStart}
        onEndChange={setEnd}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>次へ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  footer: { padding: 16 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
