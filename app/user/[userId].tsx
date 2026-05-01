import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { feedbackService } from '@/services/feedbackService';
import { authService } from '@/services/authService';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';
import { Ionicons } from '@expo/vector-icons';
import { StudyBloomColors } from '@/constants/theme';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const [responderData, setResponderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const token = await authService.getToken();
      const apiUrl = getApiBaseUrl();
      
      // Fetch responder user data
      const userResponse = await fetch(`${apiUrl}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const userData = await userResponse.json();
      setResponderData(userData);
      
      // Fetch feedback data
      const data = await feedbackService.getResponderFeedback(userId as string);
      setFeedbacks(data.feedbacks);
      setStats(data.ratingStats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const renderFeedback = ({ item }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image 
          source={{ uri: item.requester?.profilePicture || 'https://via.placeholder.com/150' }} 
          style={styles.reviewAvatar} 
        />
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewerName}>{item.requester?.name || item.requester?.fullName}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons 
                key={star} 
                name={star <= item.rating ? "star" : "star-outline"} 
                size={14} 
                color="#FFC107" 
              />
            ))}
          </View>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={styles.comment}>{item.comment}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={StudyBloomColors.primary} style={{ marginTop: 50 }} />
      ) : (
        <View style={styles.content}>
          <View style={styles.profileCard}>
            <Image 
              source={{ uri: responderData?.profilePicture || 'https://i.pravatar.cc/150?u=' + userId }}
              style={styles.mainAvatar} 
            />
            <Text style={styles.userName}>{responderData?.fullName || 'Responder'}</Text>
            <View style={styles.ratingContainer}>
               <Ionicons name="star" size={20} color="#FFC107" />
               <Text style={styles.averageRating}>{stats.average?.toFixed(1)}</Text>
               <Text style={styles.totalReviews}>({stats.count} reviews)</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Reviews</Text>
          
          <FlatList
            data={feedbacks}
            keyExtractor={(item) => item._id}
            renderItem={renderFeedback}
            contentContainerStyle={[styles.listContainer, feedbacks.length === 0 && styles.emptyListContainer]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyReviewCard}>
                <View style={styles.emptyReviewIcon}>
                  <Ionicons name="star-outline" size={18} color={StudyBloomColors.primary} />
                </View>
                <Text style={styles.emptyReviewTitle}>No reviews yet</Text>
                <Text style={styles.emptyReviewText}>
                  This responder has not received any feedback submissions yet.
                </Text>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F0F8',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 28,
    shadowColor: '#D81B60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  mainAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 16,
    marginTop: -44,
    borderWidth: 5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  averageRating: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D81B60',
  },
  totalReviews: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D81B60',
    marginBottom: 16,
    marginTop: 8,
  },
  listContainer: {
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyReviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8DDE9',
  },
  emptyReviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyReviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  emptyReviewText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666',
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D81B60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  comment: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  }
});
