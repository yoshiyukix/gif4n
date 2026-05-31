import React, { useEffect, useRef, useState } from 'react';
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
import * as StoreReview from 'expo-store-review';
import { RootStackParamList } from '../navigation/types';
import { GifPreview } from '../components/GifPreview';
import { SaveToast } from '../components/SaveToast';
import { useMediaActions } from '../hooks/useMediaActions';
import { useReviewPrompt } from '../hooks/useReviewPrompt';

import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const GREEN = colors.accent;

type ToastState = { type: 'success' | 'error'; message: string };

export default function ResultScreen({ route, navigation }: Props) {
  const { gifUri, sizeBytes, preset } = route.params;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  const insets = useSafeAreaInsets();
  const { isSaving, saveGif, shareGif } = useMediaActions();
  const { recordConversionSuccess, shouldAttemptReviewPrompt, markReviewPromptAttempted } =
    useReviewPrompt();
  const hasTrackedReviewPrompt = useRef(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (hasTrackedReviewPrompt.current) return;
    hasTrackedReviewPrompt.current = true;

    let active = true;
    let frameId: number | null = null;

    void (async () => {
      await recordConversionSuccess();
      const shouldAttempt = await shouldAttemptReviewPrompt();
      if (!active || !shouldAttempt) return;

      frameId = requestAnimationFrame(() => {
        void (async () => {
          try {
            const isAvailable = await StoreReview.isAvailableAsync();
            if (isAvailable) {
              await StoreReview.requestReview();
            }
          } catch {
            // レビュー UI の表示可否は OS 判断に委ね、失敗時も静かに握りつぶす
          } finally {
            await markReviewPromptAttempted();
          }
        })();
      });
    })();

    return () => {
      active = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [markReviewPromptAttempted, recordConversionSuccess, shouldAttemptReviewPrompt]);

  async function handleSave() {
    try {
      await saveGif(gifUri, sizeBytes, preset);
      setToast({ type: 'success', message: 'カメラロールに保存しました' });
      setToastVisible(true);
    } catch {
      setToast({ type: 'error', message: '保存に失敗しました' });
      setToastVisible(true);
    }
  }

  async function handleShare() {
    try {
      await shareGif(gifUri);
    } catch {
      setToast({ type: 'error', message: '共有に失敗しました' });
      setToastVisible(true);
    }
  }

  function handleBack() {
    navigation.popToTop();
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.pop(1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {toast && (
        <SaveToast
          visible={toastVisible}
          type={toast.type}
          message={toast.message}
          insetTop={insets.top}
          onHide={() => setToastVisible(false)}
        />
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* カード */}
        <View style={styles.card}>
          {/* GIF プレビュー + PREVIEW バッジ */}
          <View style={styles.previewWrapper}>
            <GifPreview uri={gifUri} style={styles.gifPreview} />
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>PREVIEW</Text>
            </View>
          </View>

          {/* ファイルサイズ行 */}
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ファイルサイズ</Text>
            <Text style={styles.infoValue}>{sizeMB} MB</Text>
          </View>

          {/* 解像度 / フレームレート行 */}
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>解像度 / フレームレート</Text>
            <Text style={styles.infoValue}>
              {preset.width}px / {preset.fps}fps
            </Text>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.pill, styles.savePill, isSaving && styles.pillDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" style={styles.pillIcon} />
            ) : (
              <Ionicons
                name="arrow-down-circle-outline"
                size={20}
                color="#fff"
                style={styles.pillIcon}
              />
            )}
            <Text style={styles.pillText}>カメラロールに保存</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, styles.sharePill]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={20} color="#fff" style={styles.pillIcon} />
            <Text style={styles.pillText}>共有</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.backText}>完了</Text>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // 成功セクション
  successSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // 薄い背景リング
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  previewWrapper: {
    position: 'relative',
  },
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
  infoLabel: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // アクション
  actions: {
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    paddingVertical: 17,
  },
  pillDisabled: {
    opacity: 0.6,
  },
  savePill: {
    backgroundColor: colors.primary,
  },
  sharePill: {
    backgroundColor: GREEN,
  },
  pillIcon: {
    marginRight: 8,
  },
  pillText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    width: '100%',
    backgroundColor: colors.placeholder,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
  },
  backText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
