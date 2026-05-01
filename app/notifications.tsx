import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StudyBloomColors } from '@/constants/theme';
import { notificationService, AppNotification } from '@/services/notificationService';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const list = await notificationService.getNotificationsList();
      setNotifications(list);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    await loadNotifications();
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await notificationService.clearNotificationsList();
            setNotifications([]);
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    // Mark as read
    await notificationService.markAsRead(notification.id);
    await loadNotifications();

    // Navigate to exam if applicable
    if (notification.examId) {
      router.push(`/exams/${notification.examId}`);
    }
    if (notification.helpRequestId) {
      router.push(`/help-request/${notification.helpRequestId}` as any);
      return;
    }
    if (notification.postId) {
      router.push(`/public-community/post-detail?postId=${notification.postId}` as any);
      return;
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await notificationService.deleteFromNotificationsList(notificationId);
    await loadNotifications();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type: AppNotification['type']): string => {
    switch (type) {
      case 'exam_today':
        return 'alert-circle';
      case 'exam_tomorrow':
        return 'calendar';
      case 'reminder':
        return 'alarm';
      case 'help_request_accepted':
        return 'chatbubble-ellipses';
      case 'new_comment':
        return 'chatbubble';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: AppNotification['type']): string => {
    switch (type) {
      case 'exam_today':
        return StudyBloomColors.error;
      case 'exam_tomorrow':
        return StudyBloomColors.warning;
      case 'reminder':
        return StudyBloomColors.primary;
      case 'help_request_accepted':
        return StudyBloomColors.secondary;
      case 'new_comment':
        return '#8A56AC'; // Community color
      default:
        return StudyBloomColors.secondary;
    }
  };

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNotification(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={StudyBloomColors.gray} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={StudyBloomColors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerAction}>
                <Ionicons name="checkmark-done" size={22} color={StudyBloomColors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearAll} style={styles.headerAction}>
                <Ionicons name="trash-outline" size={22} color={StudyBloomColors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <LinearGradient
            colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.unreadGradient}
          >
            <Ionicons name="notifications" size={18} color="#FFF" />
            <Text style={styles.unreadText}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={64} color={StudyBloomColors.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When you schedule exam reminders, they'll appear here
              And, Help Request updates will also show up here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerAction: {
    padding: 4,
  },
  unreadBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unreadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  unreadText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#FFF5F8',
    borderLeftWidth: 3,
    borderLeftColor: StudyBloomColors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: StudyBloomColors.black,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: StudyBloomColors.primary,
    marginLeft: 8,
  },
  body: {
    fontSize: 14,
    color: StudyBloomColors.gray,
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: StudyBloomColors.lightGray || '#AAA',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: StudyBloomColors.tertiary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
});
