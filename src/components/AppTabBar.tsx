import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#1758F0';

export type TabName = 'studio' | 'library' | 'settings';

interface Props {
  activeTab?: TabName;
  insetBottom: number;
}

export function AppTabBar({ activeTab = 'studio', insetBottom }: Props) {
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insetBottom, 12) }]}>
      {activeTab === 'studio' ? (
        <TouchableOpacity style={styles.studioPill} activeOpacity={0.9}>
          <Ionicons name="film" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.pillText}>STUDIO</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
          <Ionicons name="film-outline" size={22} color="#8E8E93" />
          <Text style={styles.tabLabel}>STUDIO</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
        <Ionicons name="albums-outline" size={22} color="#8E8E93" />
        <Text style={styles.tabLabel}>LIBRARY</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
        <Ionicons name="settings-outline" size={22} color="#8E8E93" />
        <Text style={styles.tabLabel}>SETTINGS</Text>
      </TouchableOpacity>
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
