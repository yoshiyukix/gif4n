import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { RootStackParamList } from '../navigation/types';
import { VideoPreview } from '../components/VideoPreview';
import { TrimSlider } from '../components/TrimSlider';
import { useTrim } from '../hooks/useTrim';
import { useTrimPilot } from '../hooks/useTrimPilot';

import { useSettings } from '../hooks/useSettings';

import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Trim'>;
const MIN_DURATION_SEC = 0.5;

function formatSelected(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TrimScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const insets = useSafeAreaInsets();
  const { trimRange, setStart, setEnd } = useTrim(source.durationSec || 60);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const [isSeekDragging, setIsSeekDragging] = useState(false);

  const { bytesPerSec, isPilotDone, estimateStartIndex } = useTrimPilot(source);
  const { settings } = useSettings();

  async function handleNext() {
    const duration = trimRange.endSec - trimRange.startSec;
    if (duration < MIN_DURATION_SEC) {
      Alert.alert('トリミングエラー', `最低 ${MIN_DURATION_SEC} 秒以上を選択してください。`);
      return;
    }
    let thumbnailUri: string | null = null;
    try {
      const result = await VideoThumbnails.getThumbnailAsync(source.uri, {
        time: trimRange.startSec * 1000,
      });
      thumbnailUri = result.uri;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[TrimScreen] thumbnail failed', source.uri, e);
    }
    const estimatedStartIndex =
      bytesPerSec != null
        ? estimateStartIndex(duration, settings.maxSizeMb * 1024 * 1024)
        : undefined;
    navigation.navigate('Converting', { source, trimRange, thumbnailUri, estimatedStartIndex });
  }

  const selectedSec = trimRange.endSec - trimRange.startSec;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── カスタムヘッダー ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {/* ─── 動画プレビュー ─── */}
        <View style={styles.videoWrapper}>
          <VideoPreview
            uri={source.uri}
            trimRange={trimRange}
            playbackSpeed={1}
            loop={true}
            onTimeUpdate={setCurrentTimeSec}
            seekTo={seekTo}
            externalPaused={isSeekDragging}
          />
        </View>

        {/* ─── トリミングセクション ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>トリミング</Text>
              <Text style={styles.sectionSubtitle}>必要な範囲を選択してください</Text>
            </View>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedText}>{formatSelected(selectedSec)}</Text>
              <Text style={styles.selectedLabel}>selected</Text>
            </View>
          </View>
          <TrimSlider
            durationSec={source.durationSec || 60}
            trimRange={trimRange}
            uri={source.uri}
            currentTimeSec={currentTimeSec}
            onStartChange={setStart}
            onEndChange={setEnd}
            onDragStart={() => setScrollEnabled(false)}
            onDragEnd={() => setScrollEnabled(true)}
            onSeek={setSeekTo}
            onSeekStart={() => {
              setScrollEnabled(false);
              setIsSeekDragging(true);
            }}
            onSeekEnd={() => {
              setScrollEnabled(true);
              setIsSeekDragging(false);
            }}
          />
        </View>

        {/* ─── 次へボタン ─── */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isPilotDone}
          activeOpacity={0.8}
          style={[styles.nextButton, !isPilotDone && styles.nextButtonDisabled]}
        >
          {isPilotDone ? (
            <Text style={styles.nextButtonText}>GIF動画に変換</Text>
          ) : (
            <ActivityIndicator size="small" color="#ffffff" />
          )}
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBack: { marginRight: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  headerNextButton: { width: 44 },

  // Next Button
  nextButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Scroll
  scrollContent: { paddingBottom: 8 },

  // Video
  videoWrapper: {},

  // Section
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    flexShrink: 1,
    maxWidth: 180,
  },
  selectedBadge: { alignItems: 'flex-end' },
  selectedText: { fontSize: 22, fontWeight: '700', color: colors.primary },
  selectedLabel: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
