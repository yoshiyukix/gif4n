import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import licensesData from '../assets/licenses.json';
import { colors } from '../theme';

type LicenseEntry = {
  name: string;
  version: string;
  license: string;
  licenseText: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Licenses'>;

export default function LicensesScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<LicenseEntry | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>オープンソースライセンス</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={licensesData as LicenseEntry[]}
        keyExtractor={(item) => `${item.name}@${item.version}`}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setSelected(item)}
            activeOpacity={0.7}
          >
            <View style={styles.rowContent}>
              <Text style={styles.packageName}>{item.name}</Text>
              <Text style={styles.packageVersion}>{item.version}</Text>
            </View>
            <Text style={styles.licenseTag}>{item.license}</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={selected !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selected?.name}</Text>
              <Text style={styles.modalSubtitle}>{selected?.license}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.licenseText}>
              {selected?.licenseText || 'ライセンス全文がありません。'}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  packageVersion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  licenseTag: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },
  licenseText: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 18,
    fontFamily: 'Courier',
  },
});
