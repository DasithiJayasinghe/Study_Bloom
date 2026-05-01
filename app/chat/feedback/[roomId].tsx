import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { feedbackService } from '@/services/feedbackService';
import { chatService } from '@/services/chatService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function FeedbackScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [fetchingDetails, setFetchingDetails] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await chatService.getMessages(roomId as string);
        setRoomDetails(data.room);
      } catch (error) {
        console.error('Error fetching room details:', error);
      } finally {
        setFetchingDetails(false);
      }
    };
    fetchDetails();
  }, [roomId]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await feedbackService.submitFeedback({
        chatRoomId: roomId as string,
        rating,
        comment
      });
      const responderId = roomDetails?.responder?._id || roomDetails?.responder?.id;
      if (responderId) {
        router.replace(`/user/${responderId}` as any);
      } else {
        router.replace('/(tabs)/messages');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const responder = roomDetails?.responder;

  if (fetchingDetails) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D81B60" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#F5F0FF', '#FFF0F5']} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Submit Session Feedback</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Help Session Completed!</Text>
            
            <View style={styles.avatarContainer}>
              <View style={styles.contactIconContainer}>
                <Ionicons name="call" size={40} color="#FF6B95" />
              </View>
              <Text style={styles.userName}>{responder?.fullName || ''}</Text>
            </View>

            <Text style={styles.subtitle}>How was your experience?</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Ionicons 
                    name={star <= rating ? "star" : "star-outline"} 
                    size={42} 
                    color="#FF6B95" 
                    style={styles.star}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Write your thank you message or feedback..."
              placeholderTextColor="#B0B0B0"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <TouchableOpacity 
              style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={rating === 0 || loading}
            >
              {loading ? (
                 <ActivityIndicator color="#FFF" />
              ) : (
                 <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    color: '#333',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#444',
    marginBottom: 40,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  contactIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE0ED',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  star: {
    marginHorizontal: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    minHeight: 140,
    textAlignVertical: 'top',
    marginBottom: 40,
    fontSize: 15,
    color: '#333',
    shadowColor: '#A155B9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#EC407A',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#EC407A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  }
});
