import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
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
import { LibraryStackParamList } from '../navigation/types';
import { getGifEntries, LibraryGifEntry } from '../infrastructure/GifLibraryStore';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryList'>;

const NUM_COLS = 3;
const GAP = 3;
import { colors } from '../theme';

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── GIF タイル ───────────────────────────────────────────────────────
type TileProps = {
  entry: LibraryGifEntry;
  localUri: string;
  onPress: (entry: LibraryGifEntry, localUri: string) => void;
};

const GifTile = memo(({ entry, localUri, onPress }: TileProps) => (
  <TouchableOpacity
    style={styles.tile}
    onPress={() => onPress(entry, localUri)}
    activeOpacity={0.8}
  >
    <Image source={{ uri: localUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{fmtDate(entry.createdAt)}</Text>
    </View>
  </TouchableOpacity>
));

// ─── エントリ + URI セット ────────────────────────────────────────────
type GifItem = { entry: LibraryGifEntry; localUri: string };

export default function LibraryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const entries = await getGifEntries();
    const resolved: GifItem[] = [];
    for (const entry of entries) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        const localUri = info.localUri ?? info.uri;
        if (localUri) resolved.push({ entry, localUri });
      } catch {
        // カメラロールから削除済みのエントリはスキップ
      }
    }
    setItems(resolved);
    setLoading(false);
  }, []);

  useEffect(() => {
    MediaLibrary.requestPermissionsAsync().then(({ granted }) => {
      if (granted) loadItems();
      else setLoading(false);
    });
  }, [loadItems]);

  // Library タブに戻るたびに再読み込み
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadItems);
    return unsubscribe;
  }, [navigation, loadItems]);

  const onPressItem = useCallback(
    (entry: LibraryGifEntry, localUri: string) => {
      navigation.navigate('LibraryDetail', {
        assetId: entry.assetId,
        localUri,
        sizeBytes: entry.sizeBytes,
        preset: entry.preset,
        createdAt: entry.createdAt,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GifItem>) => (
      <GifTile entry={item.entry} localUri={item.localUri} onPress={onPressItem} />
    ),
    [onPressItem],
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
        <Text style={styles.appName}>Library</Text>
      </View>

      {/* ─── GIF Grid ───────────────── */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.entry.assetId}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        contentContainerStyle={styles.gridContent}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                まだ GIF がありません。{'\n'}動画を変換して保存しましょう
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          items.length > 0 ? <Text style={styles.count}>{items.length} 個の GIF</Text> : null
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
    backgroundColor: colors.primary,
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
