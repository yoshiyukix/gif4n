import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LibraryStackParamList } from '../navigation/types';
import { GifPreview } from '../components/GifPreview';
import { SaveToast } from '../components/SaveToast';
import { MediaService } from '../infrastructure/MediaService';
import { colors } from '../theme';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryDetail'>;

type ToastState = { type: 'success' | 'error'; message: string };

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LibraryDetailScreen({ route, navigation }: Props) {
  const { localUri, sizeBytes, preset, createdAt } = route.params;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  const insets = useSafeAreaInsets();
  const media = useMemo(() => new MediaService(), []);

  const [isSharing, setIsSharing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  async function handleShare() {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await media.share(localUri);
    } catch {
      setToast({ type: 'error', message: '共有に失敗しました' });
      setToastVisible(true);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {toast && (
        <SaveToast
          visible={toastVisible}
          type={toast.type}
          message={toast.message}
          insetTop={insets.top}
          onHide={() => setToastVisible(false)}
        />
      )}

      {/* ─── Header ─────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GIF</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* カード */}
        <View style={styles.card}>
          <View style={styles.previewWrapper}>
            <GifPreview uri={localUri} style={styles.gifPreview} />
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>GIF</Text>
            </View>
          </View>

          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ファイルサイズ</Text>
            <Text style={styles.infoValue}>{sizeMB} MB</Text>
          </View>

          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>解像度 / フレームレート</Text>
            <Text style={styles.infoValue}>
              {preset.width}px / {preset.fps}fps
            </Text>
          </View>

          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>作成日時</Text>
            <Text style={styles.infoValue}>{fmtDate(createdAt)}</Text>
          </View>
        </View>

        {/* アクション */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.pill, styles.sharePill, isSharing && styles.pillDisabled]}
            onPress={handleShare}
            activeOpacity={0.85}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#fff" style={styles.pillIcon} />
            ) : (
              <Ionicons name="share-outline" size={20} color="#fff" style={styles.pillIcon} />
            )}
            <Text style={styles.pillText}>共有</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },

  // カード
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  previewWrapper: { position: 'relative' },
  gifPreview: {
    width: '100%',
    aspectRatio: undefined,
    height: 400,
    backgroundColor: '#1C1C1E',
  },
  previewBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: colors.textTertiary },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  // アクション
  actions: { gap: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    paddingVertical: 17,
  },
  pillDisabled: { opacity: 0.6 },
  sharePill: { backgroundColor: colors.accent },
  pillIcon: { marginRight: 8 },
  pillText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
