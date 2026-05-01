import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { chatService } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatContactsListProps {
  role: 'requester' | 'responder';
  title: string;
}

const CHAT_CARD_GRADIENTS = [
  ['#FFAFCC', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#A0C4FF', '#CDB4DB'],
  ['#CDB4DB', '#A0C4FF', '#CAFFBF', '#FDFFB6', '#FFD6A5', '#FFAFCC'],
  ['#BDE0FE', '#CAFFBF', '#FDFFB6', '#FFD6A5', '#FFAFCC', '#CDB4DB'],
] as const;

const CARD_TITLE_COLOR = '#7A1F74';
const CARD_TEXT_COLOR = '#90447F';
const CARD_TIME_COLOR = '#AD5C98';
const CARD_ICON_COLOR = '#F03E8A';

export default function ChatContactsList({ role, title }: ChatContactsListProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatService.getContacts(role);
      setContacts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [fetchContacts])
  );

  const getOtherUser = (room: any) => {
    if (!user) return null;
    const currentUserId = (user.id || (user as any)._id || '').toString();
    const requesterId = (room.requester?._id || '').toString();
    return requesterId === currentUserId ? room.responder : room.requester;
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within last week, show day name
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', bgColor: 'rgba(255, 255, 255, 0.84)', color: '#D63384' };
      case 'active':
        return { label: 'Active', bgColor: 'rgba(255, 255, 255, 0.9)', color: '#7C3AED' };
      case 'complete':
      case 'resolved':
      case 'Resolved':
        return { label: 'Resolved', bgColor: 'rgba(255, 255, 255, 0.88)', color: '#2B8A6E' };
      default:
        return { label: status, bgColor: 'rgba(255, 255, 255, 0.82)', color: '#8E4585' };
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const otherUser = getOtherUser(item);
    if (!otherUser) return null;

    // Use actual status from item, handle case sensitivity
    const status = item.status || 'pending';
    const badge = getStatusBadge(status);
    const cardGradient = CHAT_CARD_GRADIENTS[index % CHAT_CARD_GRADIENTS.length];

    return (
      <TouchableOpacity
        style={styles.contactCardShadow}
        onPress={() => router.push(`/chat/${item._id}`)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.contactCard}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person-circle" size={60} color={CARD_ICON_COLOR} />
            </View>
            {status === 'active' && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.contactName} numberOfLines={1}>
                {otherUser.fullName || ''}
              </Text>
              <Text style={styles.timeText}>{formatTime(item.updatedAt)}</Text>
            </View>

            <View style={styles.messageRow}>
              <Text style={styles.snippet} numberOfLines={1}>
                {item.concern?.title || item.lastMessage || 'Starting a new conversation...'}
              </Text>
              <View style={[styles.badgeContainer, { backgroundColor: badge.bgColor }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Force light theme colors as per user request
  const bgColor = '#FDF2F8'; // Light pink background
  const primaryColor = '#D81B60'; // Magenta

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[primaryColor, '#FF6B95']} style={styles.headerGradient}>
        <SafeAreaView>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            {role === 'requester' ? (
              <TouchableOpacity
                style={styles.feedTag}
                onPress={() => router.push('/(tabs)/help-feed')}
                activeOpacity={0.85}
              >
                <Ionicons name="people-outline" size={14} color={primaryColor} />
                <Text style={styles.feedTagText}>Help Feed</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={primaryColor + '50'} />
              <Text style={styles.emptyText}>
                {role === 'requester' ? 'No help requests made yet.' : 'No active responses yet.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#D81B60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  feedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  feedTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D81B60',
  },
  contactCardShadow: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#F06292',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 6px 18px rgba(240, 62, 138, 0.16)',
      },
    }),
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.98)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    color: CARD_TITLE_COLOR,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: CARD_TIME_COLOR,
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snippet: {
    fontSize: 14,
    lineHeight: 20,
    color: CARD_TEXT_COLOR,
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    minWidth: 68,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 32
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#A6558D',
  },
});


