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
import { colors } from '../theme';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryList'>;

const NUM_COLS = 3;
const GAP = 3;

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
    const { granted } = await MediaLibrary.requestPermissionsAsync();
    if (!granted) {
      setLoading(false);
      return;
    }
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

  // focus イベントで初回表示時 + タブ戻り時に読み込む
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ─── Header ─────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
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
  root: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
