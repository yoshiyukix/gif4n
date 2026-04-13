import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#1758F0';

// Converting 画面ではタブバーを非表示にする
const HIDDEN_ROUTES = new Set(['Converting']);

const TABS = [
  { name: 'Studio', label: 'STUDIO', icon: 'film' as const, iconOutline: 'film-outline' as const },
  { name: 'Library', label: 'LIBRARY', icon: 'albums' as const, iconOutline: 'albums-outline' as const },
  { name: 'Settings', label: 'SETTINGS', icon: 'settings' as const, iconOutline: 'settings-outline' as const },
];

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
  const activeIndex = state.index;
  const animatedLeft = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (barWidth === 0) return;
    const tabWidth = barWidth / TABS.length;
    Animated.spring(animatedLeft, {
      toValue: activeIndex * tabWidth,
      useNativeDriver: false,
      tension: 300,
      friction: 30,
    }).start();
  }, [activeIndex, barWidth]);

  if (isFocusedRouteHidden(state)) return null;

  const tabWidth = barWidth > 0 ? barWidth / TABS.length : 0;

  return (
    <>
      <View
        style={styles.tabBar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.cursor, { left: animatedLeft, width: tabWidth }]}
          />
        )}
        {TABS.map((tab, index) => {
          const isFocused = activeIndex === index;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              activeOpacity={0.8}
              onPress={() => !isFocused && navigation.navigate(tab.name)}
            >
              <Ionicons
                name={isFocused ? tab.icon : tab.iconOutline}
                size={20}
                color={isFocused ? '#fff' : '#8E8E93'}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.safeArea, { height: Math.max(insets.bottom, 12) }]} />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  cursor: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    borderRadius: 30,
    backgroundColor: BLUE,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#fff',
  },
  safeArea: {
    backgroundColor: '#fff',
  },
});
