import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  chipBg: '#F4EEF4',
};

export default function HelpRequestHome() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('All');

  const loadFolders = useCallback(async () => {
    try {
      const data = await folderService.getMyFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setFolders([]);
      Alert.alert('Error', 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFolders();
    }, [loadFolders])
  );

  const handleCreateFolder = async (name: string) => {
    await folderService.createFolder(name);
    await loadFolders();
  };

  const filteredFolders = useMemo(() => {
    if (!Array.isArray(folders)) return [];
    if (selectedFolder === 'All') return folders;
    return folders.filter((folder) => folder._id === selectedFolder);
  }, [folders, selectedFolder]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>My Help Requests</Text>

          <TouchableOpacity
            style={styles.helpFeedButton}
            onPress={() => router.push('/(tabs)/help-feed' as any)}
          >
            <Ionicons name="people-circle-outline" size={22} color="#C98CC5" />
            <Text style={styles.helpFeedText}>HELPFEED</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/help-request/create' as any)}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary]}
            style={styles.createBox}
          >
            <Ionicons name="add" size={28} color="#fff" />
            <Text style={styles.createText}>Create New Help Request</Text>
          </LinearGradient>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              selectedFolder === 'All' && styles.chipActive,
            ]}
            onPress={() => setSelectedFolder('All')}
          >
            <Text
              style={[
                styles.chipText,
                selectedFolder === 'All' && styles.chipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {folders.map((folder) => (
            <TouchableOpacity
              key={folder._id}
              style={[
                styles.chip,
                selectedFolder === folder._id && styles.chipActive,
              ]}
              onPress={() => setSelectedFolder(folder._id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedFolder === folder._id && styles.chipTextActive,
                ]}
              >
                {folder.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>🗂 My Folders</Text>
        <Text style={styles.sectionSubTitle}>Keep your requests neatly grouped.</Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : filteredFolders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No folders found.</Text>
          </View>
        ) : (
          filteredFolders.map((folder) => (
            <TouchableOpacity
              key={folder._id}
              style={styles.card}
              onPress={() =>
                router.push(`/help-request/folder/${folder._id}` as any)
              }
              activeOpacity={0.9}
            >
              <View style={styles.cardLeft}>
                <Ionicons name="folder" size={26} color={COLORS.primary} />
                <Text style={styles.cardText}>{folder.name}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingBtn}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

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
    padding: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  helpFeedButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpFeedText: {
    fontSize: 9,
    color: '#A58AA4',
    fontWeight: '700',
    marginTop: 2,
  },
  createBox: {
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  createText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
    fontWeight: 'bold',
  },
  chipsContainer: {
    paddingRight: 24,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    color: '#000',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    color: COLORS.primary,
  },
  sectionSubTitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  cardText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 'auto',
    marginRight: 12,
  },
  floatingBtn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 50,
  },
  emptyBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
  },
});