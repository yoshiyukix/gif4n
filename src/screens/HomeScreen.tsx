import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import { VideoImportService, normalizeMediaLibraryUri } from '../infrastructure/VideoImportService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const NUM_COLS = 3;
const GAP = 3;
const BLUE = '#1758F0';

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
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      const localUri = normalizeMediaLibraryUri(info.localUri ?? '');
      if (!localUri) {
        console.warn('[VideoTile] no localUri', asset.uri);
        return;
      }
      const ext = localUri.split('.').pop() ?? 'mov';
      const safeId = asset.id.replace(/\//g, '_');
      const tempUri = `${FileSystem.cacheDirectory}thumb-${safeId}.${ext}`;
      try {
        // 権限エラーを避けるため、アクセス元に関わらず必ずキャッシュへコピーしてから生成
        await FileSystem.copyAsync({ from: localUri, to: tempUri });
        const { uri } = await VideoThumbnails.getThumbnailAsync(tempUri, { time: 0 });
        if (!cancelled) setThumbUri(uri);
      } catch (e) {
        console.warn('[VideoTile] thumbnail failed', asset.uri, e);
      } finally {
        FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset]);

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
  const videoImportService = useMemo(() => new VideoImportService(), []);

  useEffect(() => {
    MediaLibrary.requestPermissionsAsync().then((perm) => {
      setGranted(perm.granted);
      if (perm.granted) loadVideos();
    });
  }, []);

  async function loadVideos() {
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: 200,
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
        console.warn('[HomeScreen] importAsset failed', asset.uri, e);
        Alert.alert(
          'この動画は変換できません',
          'シネマティックモード・スパーシャルビデオなど一部の形式には対応していません。別の動画をお試しください。',
        );
      }
    },
    [navigation, videoImportService],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MediaLibrary.Asset>) => (
      <VideoTile asset={item} onPress={onPressVideo} />
    ),
    [onPressVideo],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ─── Header ─────────────────── */}
      <View style={styles.header}>
        <View style={styles.logo}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.logoDot} />
          ))}
        </View>
        <Text style={styles.appName}>GIF to Note</Text>
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
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    backgroundColor: BLUE,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
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
  emptyText: { color: '#8E8E93', fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
  count: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    marginVertical: 24,
  },
});
