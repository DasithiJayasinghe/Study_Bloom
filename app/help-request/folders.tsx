import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { folderService, FolderItem } from '../../services/folderService';
import CreateFolderModal from '../../components/help-request/CreateFolderModal';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#D81B60',
  secondary: '#9C27B0',
  background: '#F3E5F5',
  white: '#FFFFFF',
  text: '#211826',
  muted: '#7A6A78',
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export default function FolderListScreen() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const data = await folderService.getMyFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load folders');
      setFolders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFolders();
    }, [loadFolders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFolders();
  }, [loadFolders]);

  const handleCreateFolder = async (folderName: string) => {
    await folderService.createFolder(folderName);
    await loadFolders();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>My Folders</Text>

          <View style={styles.iconButton}>
            <Text style={{ fontSize: 20 }}>🗂️</Text>
          </View>
        </View>

        <Text style={styles.topLabel}>ORGANIZE REQUESTS</Text>
        <Text style={styles.bigTitle}>Keep your requests neatly grouped</Text>

        {/* MAIN CREATE CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.createFolderHero}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.createFolderHeroIcon}>
            <Ionicons name="folder-open" size={26} color={COLORS.primary} />
          </View>

          <View style={styles.createFolderHeroTextWrap}>
            <Text style={styles.createFolderHeroTitle}>Create New Folder</Text>
            <Text style={styles.createFolderHeroSub}>
              Add a folder to organize your requests by subject
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading folders...</Text>
          </View>
        ) : folders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={42} color={COLORS.secondary} />
            <Text style={styles.emptyTitle}>No folders yet</Text>
            <Text style={styles.emptyText}>
              Create your first folder to organize your help requests.
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.createFolderBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.createFolderBtnText}>Create Folder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Your folders</Text>

            {folders.map((folder) => (
              <TouchableOpacity
                key={folder._id}
                activeOpacity={0.9}
                style={styles.folderCard}
                onPress={() => router.push(`/help-request/folder/${folder._id}` as any)}
              >
                <View style={styles.folderIconCircle}>
                  <Ionicons name="folder" size={22} color={COLORS.primary} />
                </View>

                <View style={styles.folderTextArea}>
                  <Text style={styles.folderName}>{folder.name}</Text>
                  <Text style={styles.folderMeta}>
                    Created on {formatDate(folder.createdAt)}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <CreateFolderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreateFolder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F7EDF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  bigTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 40,
    marginBottom: 22,
  },

  createFolderHero: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  createFolderHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8D9E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  createFolderHeroTextWrap: {
    flex: 1,
  },
  createFolderHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  createFolderHeroSub: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
  },

  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: COLORS.muted,
    marginBottom: 20,
  },
  createFolderBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  createFolderBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  folderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  folderIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8D9E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  folderTextArea: {
    flex: 1,
  },
  folderName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  folderMeta: {
    fontSize: 13,
    color: COLORS.muted,
  },
});