import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#1758F0';

// Converting 画面ではタブバーを非表示にする
const HIDDEN_ROUTES = new Set(['Converting']);

function isFocusedRouteHidden(state: BottomTabBarProps['state']): boolean {
  for (const route of state.routes) {
    // 各タブの子スタック状態を確認
    const tabState = route.state;
    if (tabState && tabState.routes) {
      const focusedChild = tabState.routes[tabState.index ?? 0];
      if (focusedChild && HIDDEN_ROUTES.has(focusedChild.name)) {
        return true;
      }
    }
  }
  return false;
}

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  if (isFocusedRouteHidden(state)) return null;

  const activeIndex = state.index;

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Studio タブ */}
      {activeIndex === 0 ? (
        <TouchableOpacity style={styles.studioPill} activeOpacity={0.9}>
          <Ionicons name="film" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.pillText}>STUDIO</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Studio')}
        >
          <Ionicons name="film-outline" size={22} color="#8E8E93" />
          <Text style={styles.tabLabel}>STUDIO</Text>
        </TouchableOpacity>
      )}

      {/* Library タブ */}
      {activeIndex === 1 ? (
        <TouchableOpacity style={styles.libraryPill} activeOpacity={0.9}>
          <Ionicons name="albums" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.pillText}>LIBRARY</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Library')}
        >
          <Ionicons name="albums-outline" size={22} color="#8E8E93" />
          <Text style={styles.tabLabel}>LIBRARY</Text>
        </TouchableOpacity>
      )}

      {/* Settings タブ */}
      {activeIndex === 2 ? (
        <TouchableOpacity style={styles.settingsPill} activeOpacity={0.9}>
          <Ionicons name="settings" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.pillText}>SETTINGS</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={22} color="#8E8E93" />
          <Text style={styles.tabLabel}>SETTINGS</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  studioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  libraryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  settingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  pillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
});
