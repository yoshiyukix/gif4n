import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SettingsStackParamList } from '../navigation/types';
import licensesData from '../assets/licenses.json';

type LicenseEntry = {
  name: string;
  version: string;
  license: string;
  licenseText: string;
};

type Props = NativeStackScreenProps<SettingsStackParamList, 'Licenses'>;

export default function LicensesScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<LicenseEntry | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1758F0" />
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
              <Ionicons name="close" size={22} color="#3C3C43" />
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
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
    color: '#1C1C1E',
  },
  packageVersion: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  licenseTag: {
    fontSize: 12,
    color: '#1758F0',
    fontWeight: '600',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
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
    color: '#3C3C43',
    lineHeight: 18,
    fontFamily: 'Courier',
  },
});
