import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { VideoImportService } from '../infrastructure/VideoImportService';
import { VideoSourcePreparationUseCase } from '../usecases/VideoSourcePreparationUseCase';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PrepareVideo'>;

export default function PrepareVideoScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const prepareVideoSource = useMemo(
    () => new VideoSourcePreparationUseCase(new VideoImportService()),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    prepareVideoSource
      .run(route.params.request)
      .then((source) => {
        if (cancelled) return;
        navigation.replace('Trim', { source });
      })
      .catch((e) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[PrepareVideoScreen] prepare failed', route.params.request, e);
        Alert.alert(
          'この動画は変換できません',
          'シネマティックモード・スパーシャルビデオなど一部の形式には対応していません。別の動画をお試しください。',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      });

    return () => {
      cancelled = true;
    };
  }, [navigation, prepareVideoSource, route.params.request]);

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
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>動画を準備中...</Text>
      </View>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
