import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { folderService, FolderItem } from '../../../services/folderService';
import { helpRequestService } from '../../../services/helpRequestService';
import { HelpRequest } from '../../../services/helpRequestTypes';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#D81B60',
  secondary: '#9C27B0',
  background: '#F3E5F5',
  white: '#FFFFFF',
  text: '#211826',
  muted: '#7A6A78',
  border: '#E8D8E8',
};

function formatTimeAgo(dateString: string) {
  const now = new Date().getTime();
  const created = new Date(dateString).getTime();
  const diffMs = now - created;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [folder, setFolder] = useState<FolderItem | null>(null);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const loadFolderData = useCallback(async () => {
    if (!id) return;

    try {
      const [folderData, requestData] = await Promise.all([
        folderService.getFolderById(id),
        folderService.getRequestsForFolder(id),
      ]);

      setFolder(folderData);
      setFolderName(folderData?.name || '');
      setRequests(Array.isArray(requestData) ? requestData : []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load folder details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFolderData();
    }, [loadFolderData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFolderData();
  }, [loadFolderData]);

  const handleDeleteFolder = () => {
    setMenuVisible(false);

    Alert.alert(
      'Delete Folder',
      'Are you sure you want to delete this folder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await folderService.deleteFolder(id);
              Alert.alert('Success', 'Folder deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/help-request' as any),
                },
              ]);
            } catch (error: any) {
              Alert.alert(
                'Delete Error',
                error.message || 'Failed to delete folder'
              );
            }
          },
        },
      ]
    );
  };

  const handleRenameFolder = async () => {
    if (!folderName.trim()) {
      Alert.alert('Validation', 'Folder name is required');
      return;
    }

    try {
      setRenaming(true);
      await folderService.updateFolder(id, folderName.trim());
      setRenameVisible(false);
      await loadFolderData();
      Alert.alert('Success', 'Folder renamed successfully');
    } catch (error: any) {
      Alert.alert('Rename Error', error.message || 'Failed to rename folder');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteRequest = (requestId: string) => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await helpRequestService.deleteHelpRequest(requestId);
              Alert.alert('Success', 'Request deleted successfully');
              loadFolderData();
            } catch (error: any) {
              Alert.alert('Delete Error', error.message || 'Failed to delete request');
            }
          },
        },
      ]
    );
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

          <Text style={styles.headerTitle}>Folder Details</Text>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading folder...</Text>
          </View>
        ) : (
          <>
            <View style={styles.folderHero}>
              <View style={styles.folderIconCircle}>
                <Ionicons name="folder" size={30} color={COLORS.primary} />
              </View>

              <Text style={styles.folderName}>{folder?.name || 'Folder'}</Text>
              <Text style={styles.folderMeta}>
                {requests.length} request{requests.length === 1 ? '' : 's'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Requests inside this folder</Text>

            {requests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No requests inside this folder</Text>
                <Text style={styles.emptyText}>
                  Requests added to this folder will appear here.
                </Text>
              </View>
            ) : (
              requests.map((item) => {
                const statusLabel =
                  item.status === 'resolved'
                    ? 'Resolved'
                    : item.status === 'accepted' || !!item.acceptedBy
                      ? 'Accepted'
                      : 'Open';

                return (
                  <View key={item._id} style={styles.requestCard}>
                    <View style={styles.requestTopRow}>
                      <Text style={styles.requestSubject}>{item.subject}</Text>

                      <View style={styles.requestTopRight}>
                        {item.isUrgent ? (
                          <View style={styles.urgentBadge}>
                            <Text style={styles.urgentBadgeText}>URGENT</Text>
                          </View>
                        ) : null}

                        {(item.status === 'open' || item.status === 'resolved') && (
                          <TouchableOpacity
                            onPress={() => handleDeleteRequest(item._id)}
                            style={styles.moreBtn}
                          >
                            <Ionicons
                              name="ellipsis-vertical"
                              size={18}
                              color={COLORS.muted}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <Text style={styles.requestTitle} numberOfLines={1}>
                      {item.questionTitle}
                    </Text>

                    <Text style={styles.requestDescription} numberOfLines={2}>
                      {item.questionDetails}
                    </Text>

                    <View style={styles.requestFooter}>
                      <Text style={styles.requestTime}>{formatTimeAgo(item.createdAt)}</Text>

                      <View style={styles.actionButtonsRow}>
                        <View
                          style={[
                            styles.statusPill,
                            item.status === 'resolved'
                              ? styles.statusPillResolved
                              : item.status === 'accepted' || !!item.acceptedBy
                                ? styles.statusPillAccepted
                                : styles.statusPillOpen,
                          ]}
                        >
                          <Text style={styles.statusPillText}>{statusLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setRenameVisible(true);
              }}
            >
              <Feather name="edit-2" size={18} color={COLORS.text} />
              <Text style={styles.menuItemText}>Rename Folder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteFolder}>
              <Feather name="trash-2" size={18} color={COLORS.primary} />
              <Text style={[styles.menuItemText, { color: COLORS.primary }]}>
                Delete Folder
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Rename Folder</Text>

            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              placeholder="Enter folder name"
              placeholderTextColor="#A58AA4"
              style={styles.renameInput}
            />

            <View style={styles.renameActions}>
              <TouchableOpacity
                style={styles.renameCancelBtn}
                onPress={() => setRenameVisible(false)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.renameSaveBtn}
                onPress={handleRenameFolder}
                disabled={renaming}
              >
                <Text style={styles.renameSaveText}>
                  {renaming ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 22,
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
  folderHero: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  folderIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F8D9E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  folderName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  folderMeta: {
    fontSize: 14,
    color: COLORS.muted,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  requestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestSubject: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.2,
  },
  urgentBadge: {
    backgroundColor: '#FFE5EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  urgentBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  moreBtn: {
    padding: 4,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 22,
  },
  requestFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTime: {
    fontSize: 12,
    color: '#B2A4B0',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuBox: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 8,
    alignSelf: 'flex-end',
    marginTop: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  renameCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
  },
  renameTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 14,
  },
  renameInput: {
    backgroundColor: '#F7EDF7',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  renameCancelText: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  renameSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  renameSaveText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusPillOpen: {
    backgroundColor: '#F6E6F3',
  },
  statusPillAccepted: {
    backgroundColor: '#FFF0C2',
  },
  statusPillResolved: {
    backgroundColor: '#E7F7EF',
  },
  statusPillText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
});
