import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Alert,
  AppState,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ListRenderItemInfo,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../navigation/types';
import { useVideoThumbnail } from '../hooks/useVideoThumbnail';
import { VideoAssetReference } from '../types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const NUM_COLS = 3;
const GAP = 3;
const VIDEO_FETCH_LIMIT = 200;
const THUMBNAIL_PRELOAD_ROWS = 2;

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── サムネイル遅延生成タイル ──────────────────────────────────────────────
type TileProps = {
  asset: MediaLibrary.Asset;
  onPress: (asset: MediaLibrary.Asset) => void;
  shouldLoadThumbnail: boolean;
};

const VideoTile = memo(({ asset, onPress, shouldLoadThumbnail }: TileProps) => {
  const thumbUri = useVideoThumbnail(asset, shouldLoadThumbnail);

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

function toVideoAssetReference(asset: MediaLibrary.Asset): VideoAssetReference {
  return {
    id: asset.id,
    filename: asset.filename,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    uri: asset.uri,
  };
}

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [granted, setGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [thumbnailAssetIds, setThumbnailAssetIds] = useState<Set<string>>(() => new Set());
  const videosRef = useRef<MediaLibrary.Asset[]>([]);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 25 });

  const loadVideos = useCallback(async () => {
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: VIDEO_FETCH_LIMIT,
      sortBy: MediaLibrary.SortBy.creationTime,
    });
    videosRef.current = assets;
    setVideos(assets);
  }, []);

  useEffect(() => {
    MediaLibrary.requestPermissionsAsync().then((perm) => {
      setGranted(perm.granted);
      if (perm.granted) loadVideos();
    });
  }, [loadVideos]);

  useEffect(() => {
    if (!granted) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadVideos();
    });
    return () => sub.remove();
  }, [granted, loadVideos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  }, [loadVideos]);

  const onPressVideo = useCallback(
    (asset: MediaLibrary.Asset) => {
      navigation.navigate('PrepareVideo', {
        request: { kind: 'asset-reference', asset: toVideoAssetReference(asset) },
      });
    },
    [navigation],
  );

  const onPickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/*'],
        copyToCacheDirectory: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      navigation.navigate('PrepareVideo', {
        request: {
          kind: 'file',
          fileUri: file.uri,
          filename: file.name ?? 'video.mp4',
          fileSize: file.size ?? 0,
        },
      });
    } catch {
      Alert.alert(
        'この動画は変換できません',
        'ファイルにアクセスできないか、対応していない動画形式です。別のファイルをお試しください。',
      );
    }
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MediaLibrary.Asset>) => (
      <VideoTile
        asset={item}
        onPress={onPressVideo}
        shouldLoadThumbnail={thumbnailAssetIds.has(item.id)}
      />
    ),
    [onPressVideo, thumbnailAssetIds],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<MediaLibrary.Asset>[] }) => {
      const nextIds = new Set<string>();
      const preloadItemCount = NUM_COLS * THUMBNAIL_PRELOAD_ROWS;
      const currentVideos = videosRef.current;

      for (const viewable of viewableItems) {
        const index = viewable.index ?? -1;
        const start = Math.max(0, index - preloadItemCount);
        const end = Math.min(currentVideos.length - 1, index + preloadItemCount);

        for (let i = start; i <= end; i += 1) {
          const asset = currentVideos[i];
          if (asset) nextIds.add(asset.id);
        }
      }

      setThumbnailAssetIds(nextIds);
    },
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ─── Header ─────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="設定を開く"
        >
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
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
        extraData={thumbnailAssetIds}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        contentContainerStyle={styles.gridContent}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
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
  gridContent: { paddingBottom: 110 },
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
