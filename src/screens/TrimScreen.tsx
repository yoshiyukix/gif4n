import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { RootStackParamList } from '../navigation/types';
import { VideoPreview } from '../components/VideoPreview';
import { TrimSlider } from '../components/TrimSlider';
import { useTrim } from '../hooks/useTrim';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Trim'>;
const MIN_DURATION_SEC = 0.5;

function formatSelected(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TrimScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { source } = route.params;
  const { trimRange, setStart, setEnd } = useTrim(source.durationSec || 60);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const [isSeekDragging, setIsSeekDragging] = useState(false);

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
    navigation.navigate('Converting', { source, trimRange, thumbnailUri });
  }

  const selectedSec = trimRange.endSec - trimRange.startSec;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
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

        <TouchableOpacity
          onPress={handleNext}
          disabled={selectedSec < MIN_DURATION_SEC}
          activeOpacity={0.8}
          style={[styles.nextButton, selectedSec < MIN_DURATION_SEC && styles.nextButtonDisabled]}
        >
          <Text style={styles.nextButtonText}>GIF動画に変換</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
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
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  videoWrapper: {
    marginTop: 18,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.cardBackground,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.accentSubtle,
  },
  selectedText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
  selectedLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.accent,
  },
});
