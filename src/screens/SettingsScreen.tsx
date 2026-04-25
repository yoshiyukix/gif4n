import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SettingsStackParamList } from '../navigation/types';
import { useSettings } from '../hooks/useSettings';
import { AppSettings } from '../types';
import { colors } from '../theme';
import { version } from '../../package.json';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

const APP_VERSION = version;

const MAX_SIZE_OPTIONS: { label: string; value: AppSettings['maxSizeMb'] }[] = [
  { label: '6 MB', value: 6 },
  { label: '8 MB', value: 8 },
  { label: '10 MB', value: 10 },
];

const PRIVACY_POLICY = `このアプリは、動画・GIFデータを外部サーバーへ送信しません。すべての変換処理はお使いの端末上で完結します。

カメラロールへのアクセス権限は、動画の選択および変換後のGIF保存にのみ使用します。`;

export default function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings } = useSettings();

  function handlePrivacyPolicy() {
    Alert.alert('プライバシーポリシー', PRIVACY_POLICY, [{ text: '閉じる' }]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 変換セクション */}
        <Text style={styles.sectionLabel}>変換</Text>
        <View style={styles.card}>
          <Text style={styles.itemLabel}>最大ファイルサイズ</Text>
          <Text style={styles.itemDescription}>
            変換後 GIF の上限サイズ。小さくすると高品質設定から落とされやすくなります。
          </Text>
          <View style={styles.segmentRow}>
            {MAX_SIZE_OPTIONS.map((opt) => {
              const active = settings.maxSizeMb === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  activeOpacity={0.8}
                  onPress={() => updateSettings({ maxSizeMb: opt.value })}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* アプリ情報セクション */}
        <Text style={styles.sectionLabel}>アプリ情報</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.itemLabel}>バージョン</Text>
            <Text style={styles.infoValue}>v{APP_VERSION}</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={handlePrivacyPolicy}
            activeOpacity={0.7}
          >
            <Text style={styles.itemLabel}>プライバシーポリシー</Text>
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.push('Licenses')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemLabel}>オープンソースライセンス</Text>
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  segmentTextActive: {
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
