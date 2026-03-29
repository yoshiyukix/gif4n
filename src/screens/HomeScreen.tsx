import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../navigation/types';
import { VideoSource } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const ALLOWED_MIME = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
const ALLOWED_EXT = /\.(mp4|mov|m4v)$/i;

export default function HomeScreen({ navigation }: Props) {

  function navigateWithSource(source: VideoSource) {
    navigation.navigate('Trim', { source });
  }

  function showFormatError() {
    Alert.alert('形式エラー', 'MP4 または MOV ファイルを選択してください。');
  }

  async function pickFromLibrary() {
    const result = await launchImageLibrary({ mediaType: 'video', includeExtra: true });
    if (result.didCancel || !result.assets?.length) return;

    const asset: Asset = result.assets[0];
    if (!asset.uri) return;

    const type = asset.type ?? '';
    if (!ALLOWED_MIME.includes(type)) {
      if (!ALLOWED_EXT.test(asset.fileName ?? asset.uri)) {
        showFormatError();
        return;
      }
    }

    navigateWithSource({
      uri: asset.uri,
      durationSec: asset.duration ?? 0,
      width: asset.width ?? 1920,
      height: asset.height ?? 1080,
      fileSizeBytes: asset.fileSize ?? 0,
    });
  }

  async function pickFromFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (!ALLOWED_EXT.test(asset.name ?? asset.uri)) {
      showFormatError();
      return;
    }

    navigateWithSource({
      uri: asset.uri,
      durationSec: 0, // ドキュメントピッカーは duration 不明のため 0（TrimScreen で更新）
      width: 1920,
      height: 1080,
      fileSizeBytes: asset.size ?? 0,
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>GIF に変換する動画を選択</Text>
      <TouchableOpacity style={styles.button} onPress={pickFromLibrary}>
        <Text style={styles.buttonText}>カメラロールから選択</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={pickFromFiles}>
        <Text style={styles.buttonText}>ファイルから選択</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 18, fontWeight: '600', marginBottom: 32, textAlign: 'center' },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: { backgroundColor: '#34C759' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

