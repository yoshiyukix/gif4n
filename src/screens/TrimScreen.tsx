import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
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
import { usePilotEstimation } from '../hooks/usePilotEstimation';
import { NativeGifService } from '../infrastructure/NativeGifService';
import { PilotEstimationUseCase } from '../usecases/PilotEstimationUseCase';
import { useSettings } from '../hooks/useSettings';

type Props = NativeStackScreenProps<RootStackParamList, 'Trim'>;

const BLUE = '#1758F0';
const MIN_DURATION_SEC = 0.5;

const SPEED_OPTIONS: { label: string; sublabel: string; value: number }[] = [
  { label: '0.5x', sublabel: 'SLOW', value: 0.5 },
  { label: '1.0x', sublabel: 'NORMAL', value: 1.0 },
  { label: '1.5x', sublabel: 'FAST', value: 1.5 },
  { label: '2.0x', sublabel: 'DOUBLE', value: 2.0 },
];

function formatSelected(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TrimScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const insets = useSafeAreaInsets();
  const { trimRange, setStart, setEnd } = useTrim(source.durationSec || 60);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const [isSeekDragging, setIsSeekDragging] = useState(false);

  const nativeService = useMemo(() => new NativeGifService(), []);
  const pilotUseCase = useMemo(() => new PilotEstimationUseCase(nativeService), [nativeService]);
  const { bytesPerSec, isPilotDone } = usePilotEstimation(source, pilotUseCase);
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
      console.warn('[TrimScreen] thumbnail failed', source.uri, e);
    }
    const estimatedStartIndex =
      bytesPerSec != null
        ? Math.max(
            0,
            pilotUseCase.estimateStartIndex(bytesPerSec, duration, settings.maxSizeMb * 1024 * 1024) - 1,
          )
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
          <Ionicons name="chevron-back" size={24} color={BLUE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trim Video</Text>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isPilotDone}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerNextButton}
        >
          {isPilotDone ? (
            <Text style={styles.headerNext}>Next</Text>
          ) : (
            <ActivityIndicator size="small" color={BLUE} />
          )}
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
            playbackSpeed={playbackSpeed}
            loop={loopEnabled}
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
              <Text style={styles.sectionSubtitle}>動画の必要な範囲を選択してください</Text>
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

        {/* ─── 再生速度セクション ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStandalone}>再生速度</Text>
          <View style={styles.speedRow}>
            {SPEED_OPTIONS.map((opt) => {
              const active = playbackSpeed === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.speedButton, active && styles.speedButtonActive]}
                  onPress={() => setPlaybackSpeed(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.speedLabel, active && styles.speedLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.speedSublabel, active && styles.speedSublabelActive]}>
                    {opt.sublabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── ループ再生カード ─── */}
        <View style={styles.loopCard}>
          <View style={styles.loopIconWrap}>
            <Ionicons name="repeat" size={20} color={BLUE} />
          </View>
          <View style={styles.loopText}>
            <Text style={styles.loopTitle}>Loop Playback</Text>
            <Text style={styles.loopSub}>Repeat trimmed segment</Text>
          </View>
          <Switch
            value={loopEnabled}
            onValueChange={setLoopEnabled}
            trackColor={{ false: '#E5E5EA', true: BLUE }}
            thumbColor="#fff"
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerBack: { marginRight: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  headerNextButton: { width: 44, alignItems: 'flex-end', justifyContent: 'center' },
  headerNext: { fontSize: 17, fontWeight: '600', color: BLUE },

  // Scroll
  scrollContent: { paddingBottom: 8 },

  // Video
  videoWrapper: {
    margin: 16,
  },

  // Section
  section: {
    backgroundColor: '#fff',
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
    color: '#1C1C1E',
    marginBottom: 2,
  },
  sectionTitleStandalone: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    flexShrink: 1,
    maxWidth: 180,
  },
  selectedBadge: { alignItems: 'flex-end' },
  selectedText: { fontSize: 22, fontWeight: '700', color: BLUE },
  selectedLabel: { fontSize: 13, fontWeight: '600', color: BLUE },

  // Speed
  speedRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  speedButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  speedButtonActive: { backgroundColor: BLUE },
  speedLabel: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  speedLabelActive: { color: '#fff' },
  speedSublabel: { fontSize: 10, fontWeight: '600', color: '#8E8E93', marginTop: 2 },
  speedSublabelActive: { color: 'rgba(255,255,255,0.8)' },

  // Loop card
  loopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    gap: 14,
  },
  loopIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EAF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopText: { flex: 1 },
  loopTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  loopSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
});
