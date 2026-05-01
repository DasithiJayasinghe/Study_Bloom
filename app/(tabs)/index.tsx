import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StudyBloomColors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';
import { useExams } from '@/contexts/ExamContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { helpRequestService } from '@/services/helpRequestService';
import { useBlossomTasks } from '@/contexts/BlossomTasksContext';
import { blossomApi } from '@/services/blossomApi';
import { localDateKey } from '@/utils/localDateKey';
import { studySpaceService } from '@/services/studySpaceService';

const moodMessages: Record<string, { title: string; message: string; color: string }> = {
  Happy: {
    title: '🌟 Wonderful!',
    message: "Your happiness is contagious! Keep spreading those good vibes. Today is a great day to accomplish something amazing!",
    color: '#FFD93D',
  },
  Calm: {
    title: '🌸 Inner Peace',
    message: "Being calm is a superpower. Use this peaceful energy to focus on what matters most to you today.",
    color: '#6BCB77',
  },
  Tired: {
    title: '💤 Take It Easy',
    message: "It's okay to rest. Listen to your body and take breaks when needed. Remember, rest is productive too!",
    color: '#A0C4FF',
  },
  Stressed: {
    title: '🤗 You Got This!',
    message: "Take a deep breath. Whatever you're facing, you're stronger than you think. Break tasks into smaller steps and tackle them one at a time.",
    color: '#FF6B6B',
  },
  Loved: {
    title: '💕 So Sweet!',
    message: "Feeling loved is beautiful! Cherish those connections and remember to spread that love to others around you.",
    color: '#FF69B4',
  },
};

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, logout, isAuthenticated, profileImage } = useAuth();
  const { exams, fetchExams } = useExams();
  const { tasks } = useBlossomTasks();
  const completedTasksCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const [dailyExpenseCount, setDailyExpenseCount] = useState(0);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [studyHours, setStudyHours] = useState('0h');

  const loadTodayExpenseCount = useCallback(async () => {
    if (!isAuthenticated) {
      setDailyExpenseCount(0);
      return;
    }
    try {
      const { entries } = await blossomApi.getExpenses(localDateKey());
      setDailyExpenseCount(entries.length);
    } catch {
      setDailyExpenseCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadTodayExpenseCount();
  }, [loadTodayExpenseCount]);

  useFocusEffect(
    useCallback(() => {
      void loadTodayExpenseCount();
    }, [loadTodayExpenseCount])
  );

  // Check for notifications and upcoming exams on focus
  useFocusEffect(
    useCallback(() => {
      const checkNotifications = async () => {
        try {
          // Request permissions
          await notificationService.requestPermissions();

          // Check for upcoming exams and add notifications
          if (exams.length > 0) {
            await notificationService.checkUpcomingExams(exams);
          }

          // Help request accepted notifications sync
          const myHelpRequests = await helpRequestService.getMyHelpRequests();
          await notificationService.checkAcceptedHelpRequestNotifications(myHelpRequests);

          // Sync community notifications from backend
          await notificationService.fetchNotificationsFromBackend();

          const count = await notificationService.getUnreadCount();
          setUnreadCount(count);
        } catch (error) {
          console.log('Notification sync error:', error);

          // Get unread count
          const count = await notificationService.getUnreadCount();
          setUnreadCount(count);
        }
      };

      if (isAuthenticated) {
        checkNotifications();
      }
    }, [isAuthenticated, exams])
  );

  // Fetch exams when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchExams();
    }
  }, [isAuthenticated, fetchExams]);

  const loadStudyStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStudyHours('0h');
      return;
    }
    try {
      const stats = await studySpaceService.getSessionStats();

      const totalSeconds = stats.todayTotalSeconds || 0;
      if (totalSeconds === 0) {
        setStudyHours('0h');
      } else if (totalSeconds < 3600) {
        const mins = Math.floor(totalSeconds / 60);
        setStudyHours(`${mins}m`);
      } else {
        const hours = totalSeconds / 3600;
        setStudyHours(`${hours.toFixed(1)}h`);
      }
    } catch (error) {
      console.log('Error loading study stats:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadStudyStats();
  }, [loadStudyStats]);

  useFocusEffect(
    useCallback(() => {
      void loadStudyStats();
    }, [loadStudyStats])
  );

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/landing');
  };

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setShowMoodModal(true);
  };

  const closeMoodModal = () => {
    setShowMoodModal(false);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[StudyBloomColors.neutral, '#FFF0F5']}
          style={styles.gradientBackground}
        >
          <View style={styles.centeredContent}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="flower" size={48} color={StudyBloomColors.primary} />
            </View>
            <Text style={styles.welcomeText}>Please sign in to continue</Text>
            <TouchableOpacity
              style={styles.signInButtonWrapper}
              onPress={() => router.replace('/(auth)/landing')}
            >
              <LinearGradient
                colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInGradient}
              >
                <Text style={styles.signInButtonText}>Go to Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const firstName = user?.fullName?.split(' ')[0] || 'Student';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Profile */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{firstName}!</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationBtn} onPress={handleNotificationPress}>
              <Ionicons name="notifications-outline" size={22} color={StudyBloomColors.primary} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileAvatar} onPress={() => router.push('/(tabs)/profile')}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={[StudyBloomColors.tertiary, StudyBloomColors.primary]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Cute Banner Card */}
        <View style={styles.bannerCard}>
          <LinearGradient
            colors={['#FFE5EC', '#FFF0F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextSection}>
                <Text style={styles.bannerTitle}>Keep Blooming!</Text>
                <Text style={styles.bannerSubtitle}>You are doing amazing sweetie</Text>
              </View>
              <View style={styles.bannerIllustration}>
                <View style={styles.flowerBig}>
                  <Ionicons name="flower" size={50} color={StudyBloomColors.primary} />
                </View>
                <View style={styles.flowerSmall1}>
                  <Ionicons name="flower-outline" size={24} color={StudyBloomColors.tertiary} />
                </View>
                <View style={styles.flowerSmall2}>
                  <Ionicons name="heart" size={18} color={StudyBloomColors.secondary} />
                </View>
                <View style={styles.sparkle1}>
                  <Ionicons name="sparkles" size={16} color="#FFD700" />
                </View>
                <View style={styles.sparkle2}>
                  <Ionicons name="star" size={14} color={StudyBloomColors.tertiary} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#FFE5EC' }]}>
              <Ionicons name="checkmark-done" size={22} color={StudyBloomColors.primary} />
            </View>
            <Text style={styles.quickStatNumber}>{completedTasksCount}</Text>
            <Text style={styles.quickStatLabel}>Tasks done</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="time" size={22} color="#4CAF50" />
            </View>
            <Text style={styles.quickStatNumber}>{studyHours}</Text>
            <Text style={styles.quickStatLabel}>Study</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="book" size={22} color={StudyBloomColors.secondary} />
            </View>
            <Text style={styles.quickStatNumber}>0</Text>
            <Text style={styles.quickStatLabel}>Notes</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#FCE8EF' }]}>
              <Ionicons name="wallet-outline" size={22} color="#D48A9F" />
            </View>
            <Text style={styles.quickStatNumber}>{dailyExpenseCount}</Text>
            <Text style={styles.quickStatLabel}>Daily expenses</Text>
          </View>
        </View>

        {/* Today's Focus Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Focus</Text>
        </View>

        <View style={styles.focusCard}>
          <LinearGradient
            colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.focusGradient}
          >
            <View style={styles.focusContent}>
              <View style={styles.focusIconArea}>
                <View style={styles.focusIconCircle}>
                  <Ionicons name="sunny" size={32} color="#FFD700" />
                </View>
                <View style={styles.focusStars}>
                  <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
                  <Ionicons name="star" size={16} color="rgba(255,255,255,0.8)" />
                  <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
                </View>
              </View>
              <View style={styles.focusTextArea}>
                <Text style={styles.focusTitle}>Start Your Day</Text>
                <Text style={styles.focusSubtitle}>Add your first task and begin blooming!</Text>
              </View>
              <TouchableOpacity
                style={styles.focusAddBtn}
                onPress={() => router.push('/blossom-routine/tasks' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={24} color={StudyBloomColors.primary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Features Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Garden</Text>
        </View>

        <View style={styles.featuresContainer}>
          {/* Row 1 */}
          <View style={styles.featureRow}>
            <TouchableOpacity style={styles.featureCardLarge} onPress={() => router.push('/(tabs)/exams' as any)}>
              <LinearGradient
                colors={['#FF6B9D', '#FF8A9D']}
                style={styles.featureLargeGradient}
              >
                <View style={styles.featureDecorations}>
                  <Ionicons name="calendar" size={80} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
                </View>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="calendar" size={28} color="#FFF" />
                </View>
                <Text style={styles.featureLargeTitle}>Exam Planner</Text>
                <Text style={styles.featureLargeDesc}>Schedule your success</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.featureColumnSmall}>
              <TouchableOpacity style={styles.featureCardSmall} onPress={() => router.push('/(tabs)/public-community' as any)}>
                <LinearGradient
                  colors={['#A855F7', '#9333EA']}
                  style={styles.featureSmallGradient}
                >
                  <Ionicons name="people" size={24} color="#FFF" />
                  <Text style={styles.featureSmallTitle}>Community</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.featureCardSmall}
                onPress={() => router.push('/help-request' as any)}
              >
                <LinearGradient
                  colors={['#34D399', '#10B981']}
                  style={styles.featureSmallGradient}
                >
                  <Ionicons name="hand-left" size={24} color="#FFF" />
                  <Text style={styles.featureSmallTitle}>Help Request</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.featureRow}>
            <View style={styles.featureColumnSmall}>
              <TouchableOpacity
                style={styles.featureCardSmall}
                onPress={() => router.push('/(tabs)/respond' as any)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#8E2DE2', '#4A00E0']}
                  style={styles.featureSmallGradient}
                >
                  <Ionicons name="chatbubbles" size={24} color="#FFF" />
                  <Text style={styles.featureSmallTitle}>Help Respond</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.featureCardSmall}
                onPress={() => router.push('/blossom-routine' as any)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FBBF24', '#F59E0B']}
                  style={styles.featureSmallGradient}
                >
                  <Ionicons name="sunny" size={24} color="#FFF" />
                  <Text style={styles.featureSmallTitle}>Blossom Routine</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.featureCardLarge}
              onPress={() => router.push('/study-space' as any)}
            >
              <LinearGradient
                colors={['#FB7185', '#EC4899']}
                style={styles.featureLargeGradient}
              >
                <View style={styles.featureDecorations}>
                  <Ionicons name="book" size={80} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
                </View>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="book" size={28} color="#FFF" />
                </View>
                <Text style={styles.featureLargeTitle}>My Little Study Space</Text>
                <Text style={styles.featureLargeDesc}>Your cozy corner</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mood Message Modal */}
        <Modal
          visible={showMoodModal}
          transparent
          animationType="fade"
          onRequestClose={closeMoodModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedMood && (
                <>
                  <View style={[styles.modalHeader, { backgroundColor: moodMessages[selectedMood].color }]}>
                    <Text style={styles.modalTitle}>{moodMessages[selectedMood].title}</Text>
                  </View>
                  <View style={styles.modalBody}>
                    <Text style={styles.modalMessage}>{moodMessages[selectedMood].message}</Text>
                    <TouchableOpacity style={styles.modalButton} onPress={closeMoodModal}>
                      <LinearGradient
                        colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalButtonGradient}
                      >
                        <Text style={styles.modalButtonText}>Thanks! 💖</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Daily Quote */}
        <View style={styles.quoteSection}>
          <View style={styles.quoteCard}>
            <View style={styles.quoteIconLeft}>
              <Ionicons name="chatbubble-ellipses" size={24} color={StudyBloomColors.tertiary} />
            </View>
            <Text style={styles.quoteText}>
              &quot;You are capable of amazing things. Keep believing in yourself!&quot;
            </Text>
            <View style={styles.quoteFooter}>
              <Ionicons name="heart" size={14} color={StudyBloomColors.primary} />
              <Text style={styles.quoteAuthor}>Daily Bloom</Text>
              <Ionicons name="heart" size={14} color={StudyBloomColors.primary} />
            </View>
          </View>
        </View>

        {/* Bottom Decoration */}
        <View style={styles.bottomDecoration}>
          <View style={styles.bottomFlowers}>
            <Ionicons name="flower-outline" size={20} color={StudyBloomColors.tertiary} />
            <Ionicons name="heart" size={16} color={StudyBloomColors.primary} />
            <Ionicons name="flower" size={24} color={StudyBloomColors.secondary} />
            <Ionicons name="heart" size={16} color={StudyBloomColors.primary} />
            <Ionicons name="flower-outline" size={20} color={StudyBloomColors.tertiary} />
          </View>
          <Text style={styles.bottomText}>Made with love for you</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  gradientBackground: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: StudyBloomColors.tertiary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    color: StudyBloomColors.gray,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  signInButtonWrapper: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  signInGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: 14,
    color: StudyBloomColors.gray,
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: StudyBloomColors.black,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileAvatar: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  bannerCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerGradient: {
    padding: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTextSection: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: StudyBloomColors.primary,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: StudyBloomColors.gray,
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
    gap: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  bannerIllustration: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  flowerBig: {
    position: 'absolute',
    right: 10,
    top: 20,
  },
  flowerSmall1: {
    position: 'absolute',
    left: 0,
    top: 10,
  },
  flowerSmall2: {
    position: 'absolute',
    right: 0,
    bottom: 10,
  },
  sparkle1: {
    position: 'absolute',
    left: 20,
    bottom: 20,
  },
  sparkle2: {
    position: 'absolute',
    right: 30,
    top: 0,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  quickStatCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: (width - 60) / 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: StudyBloomColors.black,
  },
  quickStatLabel: {
    fontSize: 11,
    color: StudyBloomColors.gray,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  seeAllText: {
    fontSize: 14,
    color: StudyBloomColors.primary,
    fontWeight: '500',
  },
  focusCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  focusGradient: {
    padding: 20,
  },
  focusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusIconArea: {
    marginRight: 16,
    alignItems: 'center',
  },
  focusIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusStars: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 4,
  },
  focusTextArea: {
    flex: 1,
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  focusSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  focusAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresContainer: {
    paddingHorizontal: 20,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  featureCardLarge: {
    flex: 1.2,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  featureLargeGradient: {
    padding: 18,
    height: 140,
    justifyContent: 'flex-end',
  },
  featureDecorations: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  bgIcon: {
    opacity: 0.2,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureLargeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  featureLargeDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  featureColumnSmall: {
    flex: 1,
    gap: 12,
  },
  featureCardSmall: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  featureSmallGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 64,
  },
  featureSmallTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 6,
    textAlign: 'center',
  },
  moodSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  moodCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  moodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: StudyBloomColors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  moodOptionSelected: {
    backgroundColor: '#FFE5EC',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 11,
    color: StudyBloomColors.gray,
  },
  quoteSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  quoteCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: StudyBloomColors.primary,
  },
  quoteIconLeft: {
    marginBottom: 10,
  },
  quoteText: {
    fontSize: 15,
    color: StudyBloomColors.black,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: StudyBloomColors.primary,
    fontWeight: '600',
  },
  bottomDecoration: {
    alignItems: 'center',
    marginTop: 30,
    paddingBottom: 10,
  },
  bottomFlowers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomText: {
    fontSize: 12,
    color: StudyBloomColors.gray,
    marginTop: 10,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: StudyBloomColors.black,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
