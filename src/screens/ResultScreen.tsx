import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { GifPreview } from '../components/GifPreview';
import { MediaService } from '../infrastructure/MediaService';
import * as Sharing from 'expo-sharing';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const media = new MediaService();

export default function ResultScreen({ route, navigation }: Props) {
  const { gifUri, sizeBytes, preset } = route.params;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

  async function handleSave() {
    await media.saveToLibrary(gifUri);
  }

  async function handleShare() {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(gifUri, { mimeType: 'image/gif' });
    }
  }

  function handleBack() {
    navigation.popToTop();
  }

  return (
    <View style={styles.container}>
      <GifPreview uri={gifUri} />
      <View style={styles.info}>
        <Text style={styles.infoText}>ファイルサイズ: {sizeMB} MB</Text>
        <Text style={styles.infoText}>
          解像度: {preset.width}px / {preset.fps}fps
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>カメラロールに保存</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShare}>
          <Text style={styles.buttonText}>共有</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backText}>最初に戻る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  info: { padding: 16, alignItems: 'center' },
  infoText: { fontSize: 14, color: '#666' },
  actions: { padding: 16, gap: 12 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareButton: { backgroundColor: '#34C759' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backButton: { alignItems: 'center', paddingVertical: 12 },
  backText: { color: '#007AFF', fontSize: 16 },
});
