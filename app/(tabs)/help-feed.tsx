import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
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
import { helpRequestService } from '../../services/helpRequestService';
import { HelpRequest } from '../../services/helpRequestTypes';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#D81B60',
  secondary: '#C95BEA',
  tertiary: '#F4C8F6',
  background: '#FFF7FC',
  card: '#FFFEFF',
  text: '#201924',
  muted: '#6E5A61',
  softPink: '#F8E9FA',
  urgentBg: '#FFE6E8',
  urgentText: '#C62828',
  subjectBg: '#EDC7F3',
};

function formatTimeAgo(dateString: string) {
  const now = new Date().getTime();
  const created = new Date(dateString).getTime();
  const diffMs = now - created;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  if (hours < 24) return `${hours}H AGO`;
  if (days === 1) return '1D AGO';
  return `${days}D AGO`;
}

function getUserName(user: any) {
  if (!user) return 'Anonymous';
  if (typeof user === 'object' && user.fullName) return user.fullName;
  return 'Anonymous';
}

function getProfileImage(user: any) {
  if (!user) return null;
  if (typeof user === 'object' && user.profilePicture) return user.profilePicture;
  return null;
}

function FeedCard({
  item,
  index,
}: {
  item: HelpRequest;
  index: number;
}) {
  const userName = getUserName(item.user);
  const profileImage = getProfileImage(item.user);
  const isAlt = index % 2 === 1;

  return (
    <Pressable
      onPress={() => router.push(`/help-request/${item._id}` as any)}
      style={({ pressed }) => [
        styles.cardWrap,
        pressed && styles.cardWrapPressed,
      ]}
    >
      <View
        style={[
          styles.cloudBack,
          isAlt ? styles.cloudBackAlt : styles.cloudBackMain,
        ]}
      />
      <View
        style={[
          styles.cloudFront,
          isAlt ? styles.cloudFrontAlt : styles.cloudFrontMain,
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.subjectChip}>
            <Text style={styles.subjectChipText}>{item.subject}</Text>
          </View>

          {item.isUrgent ? (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle" size={12} color={COLORS.urgentText} />
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          ) : (
            <View style={{ width: 78 }} />
          )}
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.questionTitle}
        </Text>

        <Text style={styles.cardDesc} numberOfLines={3}>
          {item.questionDetails}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.userRow}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={14} color="#fff" />
              </View>
            )}
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
          </View>

          <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HelpFeedScreen() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
  try {
    const data = await helpRequestService.getHelpFeed();
    const safeData = Array.isArray(data) ? data : [];
    setRequests(safeData);

    const requestIds = safeData
      .map((item) => item?._id)
      .filter(Boolean);

    await helpRequestService.markHelpFeedRequestsAsSeen(requestIds);
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to load help feed');
    setRequests([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFeed();
    }, [loadFeed])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, [loadFeed]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.headerCircle}
            onPress={() => router.push('/(tabs)/messages' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>HELP FEED</Text>
            <Text style={styles.headerSubtitle}>What do you need help with today?</Text>
          </View>

          <View style={styles.headerMenu}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.primary} />
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={38} color={COLORS.secondary} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>
              Help requests from other students will appear here.
            </Text>
          </View>
        ) : (
          requests.map((item, index) => (
            <FeedCard key={item._id || index} item={item} index={index} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 34,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(216,27,96,0.18)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
    textAlign: 'center',
  },
  headerMenu: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 14,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#8E6F74',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
  },

  cardWrap: {
    marginBottom: 26,
    position: 'relative',
  },
  cardWrapPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },

  cloudBack: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    bottom: 4,
    backgroundColor: '#FCEFF8',
    shadowColor: 'rgba(216,27,96,0.18)',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  cloudBackMain: {
    borderTopLeftRadius: 90,
    borderTopRightRadius: 120,
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 85,
    transform: [{ rotate: '-4deg' }],
  },
  cloudBackAlt: {
    borderTopLeftRadius: 120,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 85,
    borderBottomRightRadius: 120,
    transform: [{ rotate: '4deg' }],
  },

  cloudFront: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
    minHeight: 212,
    justifyContent: 'space-between',
  },
  cloudFrontMain: {
    borderTopLeftRadius: 82,
    borderTopRightRadius: 112,
    borderBottomLeftRadius: 112,
    borderBottomRightRadius: 78,
  },
  cloudFrontAlt: {
    borderTopLeftRadius: 112,
    borderTopRightRadius: 82,
    borderBottomLeftRadius: 78,
    borderBottomRightRadius: 112,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectChip: {
    backgroundColor: COLORS.subjectBg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  subjectChipText: {
    color: '#4B2B57',
    fontSize: 12,
    fontWeight: '700',
  },

  urgentBadge: {
    minWidth: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.urgentBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  urgentText: {
    color: COLORS.urgentText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  cardTitle: {
    marginTop: 18,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    color: COLORS.text,
  },
  cardDesc: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 26,
    color: COLORS.muted,
  },

  cardFooter: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flexShrink: 1,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});