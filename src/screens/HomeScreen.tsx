import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../navigation/types';
import { useVideoImport } from '../hooks/useVideoImport';
import { useVideoThumbnail } from '../hooks/useVideoThumbnail';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const NUM_COLS = 3;
const GAP = 3;
const VIDEO_FETCH_LIMIT = 200;

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── サムネイル遅延生成タイル ──────────────────────────────────────────────
type TileProps = {
  asset: MediaLibrary.Asset;
  onPress: (asset: MediaLibrary.Asset) => void;
};

const VideoTile = memo(({ asset, onPress }: TileProps) => {
  const thumbUri = useVideoThumbnail(asset);

  return (
    <TouchableOpacity style={styles.tile} onPress={() => onPress(asset)} activeOpacity={0.8}>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.tilePlaceholder]} />
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{fmtDuration(asset.duration)}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [granted, setGranted] = useState(false);
  const videoImportService = useVideoImport();

  useEffect(() => {
    MediaLibrary.requestPermissionsAsync().then((perm) => {
      setGranted(perm.granted);
      if (perm.granted) loadVideos();
    });
  }, []);

  async function loadVideos() {
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: VIDEO_FETCH_LIMIT,
      sortBy: MediaLibrary.SortBy.creationTime,
    });
    setVideos(assets);
  }

  const onPressVideo = useCallback(
    async (asset: MediaLibrary.Asset) => {
      try {
        const source = await videoImportService.importAsset(asset);
        navigation.navigate('Trim', { source });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[HomeScreen] importAsset failed', asset.uri, e);
        Alert.alert(
          'この動画は変換できません',
          'シネマティックモード・スパーシャルビデオなど一部の形式には対応していません。別の動画をお試しください。',
        );
      }
    },
    [navigation, videoImportService],
  );

  const onPickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/*'],
        copyToCacheDirectory: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const source = await videoImportService.importFileUri(
        file.uri,
        file.name ?? 'video.mp4',
        file.size ?? 0,
      );
      navigation.navigate('Trim', { source });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[HomeScreen] importFileUri failed', e);
      Alert.alert(
        'この動画は変換できません',
        'ファイルにアクセスできないか、対応していない動画形式です。別のファイルをお試しください。',
      );
    }
  }, [navigation, videoImportService]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MediaLibrary.Asset>) => (
      <VideoTile asset={item} onPress={onPressVideo} />
    ),
    [onPressVideo],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ─── Header ─────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Studio</Text>
        <TouchableOpacity
          onPress={onPickFile}
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="folder-open-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ─── Video Grid ─────────────── */}
      <FlatList
        data={videos}
        renderItem={renderItem}
        keyExtractor={(a) => a.id}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        contentContainerStyle={styles.gridContent}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {!granted ? 'フォトライブラリへのアクセスを許可してください' : '動画がありません'}
            </Text>
          </View>
        }
        ListFooterComponent={
          videos.length > 0 ? <Text style={styles.count}>{videos.length}個の動画</Text> : null
        }
      />
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
    paddingVertical: 16,
  },
  headerButton: {
    padding: 4,
  },
  logo: {
    width: 26,
    height: 26,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    marginRight: 10,
  },
  logoDot: {
    width: 11,
    height: 11,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },

  // Grid
  gridContent: {},
  row: { gap: GAP },
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tilePlaceholder: {
    backgroundColor: '#2C2C2E',
  },
  badge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '500' },

  // Empty / Count
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  count: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    marginVertical: 24,
  },
});
