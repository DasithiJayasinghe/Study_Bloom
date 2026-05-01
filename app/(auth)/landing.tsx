import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StudyBloomColors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface Feature {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  shortDesc: string;
  fullDesc: string;
  color: string;
  gradientColors: string[];
}

const features: Feature[] = [
  {
    icon: 'calendar',
    label: 'Exam Planner',
    shortDesc: 'Plan your success',
    fullDesc: 'Never miss an exam again! Schedule your tests, set cute reminders, and track your preparation progress. Stay organized and stress-free during exam season.',
    color: StudyBloomColors.primary,
    gradientColors: ['#FF6B9D', '#C44569'],
  },
  {
    icon: 'people',
    label: 'Community',
    shortDesc: 'Bloom together',
    fullDesc: 'Join a supportive community of fellow students! Share study tips, form study groups, and make friends who understand the student life.',
    color: StudyBloomColors.secondary,
    gradientColors: ['#A855F7', '#7C3AED'],
  },
  {
    icon: 'hand-left',
    label: 'Help Request',
    shortDesc: 'Ask for support',
    fullDesc: 'Stuck on a problem? Post your questions and get help from peers and mentors. No question is too small - we are all here to learn together!',
    color: '#4CAF50',
    gradientColors: ['#34D399', '#10B981'],
  },
  {
    icon: 'chatbubbles',
    label: 'Help Response',
    shortDesc: 'Share your wisdom',
    fullDesc: 'Share your knowledge and help other students! Answer questions, give advice, and earn recognition for being a helpful community member.',
    color: '#2196F3',
    gradientColors: ['#60A5FA', '#3B82F6'],
  },
  {
    icon: 'book',
    label: 'My Little Study Space',
    shortDesc: 'Your cozy corner',
    fullDesc: 'Create your perfect digital study sanctuary! Save notes, organize resources, track your mood, and maintain your personal wellness journal.',
    color: StudyBloomColors.tertiary,
    gradientColors: ['#FB7185', '#F472B6'],
  },
  {
    icon: 'sunny',
    label: 'Blossom Routine',
    shortDesc: 'Daily self-care',
    fullDesc: 'Build healthy habits and daily routines! Track your tasks, set self-care reminders, and watch yourself bloom into the best version of you.',
    color: '#FF9800',
    gradientColors: ['#FBBF24', '#F59E0B'],
  },
];

interface FeatureCardProps {
  feature: Feature;
  onPress: () => void;
}

function FeatureCard({ feature, onPress }: FeatureCardProps) {
  return (
    <TouchableOpacity style={styles.featureCard} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={feature.gradientColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featureGradient}
      >
        <View style={styles.featureIconContainer}>
          <Ionicons name={feature.icon} size={28} color={StudyBloomColors.white} />
        </View>
        <Text style={styles.featureLabel}>{feature.label}</Text>
        <Text style={styles.featureShortDesc}>{feature.shortDesc}</Text>
        <View style={styles.tapHint}>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.tapHintText}>Tap for more</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function LandingScreen() {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openFeatureModal = (feature: Feature) => {
    setSelectedFeature(feature);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedFeature(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={StudyBloomColors.neutral} />

      {/* Background Gradient */}
      <LinearGradient
        colors={[StudyBloomColors.neutral, '#FFF0F5', '#FDE7F0']}
        style={styles.backgroundGradient}
      >
        {/* Decorative Elements */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIconOuter}>
                <LinearGradient
                  colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                  style={styles.logoIcon}
                >
                  <Ionicons name="flower" size={44} color={StudyBloomColors.white} />
                </LinearGradient>
              </View>
            </View>
            <Text style={styles.logoText}>StudyBloom</Text>
            <View style={styles.taglineContainer}>
              <Ionicons name="heart" size={12} color={StudyBloomColors.tertiary} />
              <Text style={styles.tagline}>Bloom into your best self</Text>
              <Ionicons name="heart" size={12} color={StudyBloomColors.tertiary} />
            </View>
          </View>

          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <LinearGradient
              colors={['rgba(255,128,171,0.15)', 'rgba(156,39,176,0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeGradient}
            >
              <View style={styles.welcomeIconRow}>
                <Ionicons name="sparkles" size={20} color={StudyBloomColors.primary} />
                <Ionicons name="book" size={24} color={StudyBloomColors.secondary} />
                <Ionicons name="sparkles" size={20} color={StudyBloomColors.primary} />
              </View>
              <Text style={styles.welcomeTitle}>Your Academic Journey Starts Here</Text>
              <Text style={styles.welcomeSubtitle}>
                Organize, collaborate, and grow with your new favorite study companion
              </Text>
            </LinearGradient>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Explore Your Garden</Text>
              <Text style={styles.sectionSubtitle}>Tap any feature to learn more</Text>
            </View>

            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  feature={feature}
                  onPress={() => openFeatureModal(feature)}
                />
              ))}
            </View>
          </View>

          {/* Motivational Section */}
          <View style={styles.motivationalSection}>
            <LinearGradient
              colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.motivationalGradient}
            >
              <Ionicons name="heart" size={28} color={StudyBloomColors.white} />
              <Text style={styles.motivationalText}>
                "Every bloom starts with a single step. You've got this, beautiful!"
              </Text>
              <View style={styles.flowerDecor}>
                <Ionicons name="flower-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Ionicons name="flower" size={20} color="rgba(255,255,255,0.7)" />
                <Ionicons name="flower-outline" size={16} color="rgba(255,255,255,0.5)" />
              </View>
            </LinearGradient>
          </View>

          {/* Stats Preview */}
          <View style={styles.statsPreview}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>10K+</Text>
              <Text style={styles.statLabel}>Happy Students</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Study Groups</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>50K+</Text>
              <Text style={styles.statLabel}>Resources</Text>
            </View>
          </View>

          {/* Auth Buttons */}
          <View style={styles.authContainer}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push('/(auth)/sign-in')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="log-in-outline" size={20} color={StudyBloomColors.white} style={styles.buttonIcon} />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => router.push('/(auth)/sign-up')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color={StudyBloomColors.primary} style={styles.buttonIcon} />
              <Text style={styles.signUpButtonText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Bottom Decoration */}
          <View style={styles.bottomDecor}>
            <Ionicons name="flower-outline" size={18} color={StudyBloomColors.tertiary} />
            <Ionicons name="heart" size={14} color={StudyBloomColors.primary} />
            <Ionicons name="flower-outline" size={18} color={StudyBloomColors.secondary} />
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Feature Detail Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            {selectedFeature && (
              <>
                <LinearGradient
                  colors={selectedFeature.gradientColors as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalHeader}
                >
                  <View style={styles.modalIconContainer}>
                    <Ionicons name={selectedFeature.icon} size={36} color={StudyBloomColors.white} />
                  </View>
                  <Text style={styles.modalTitle}>{selectedFeature.label}</Text>
                </LinearGradient>
                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>{selectedFeature.fullDesc}</Text>
                  <View style={styles.modalFeatures}>
                    <View style={styles.modalFeatureItem}>
                      <Ionicons name="checkmark-circle" size={18} color={selectedFeature.color} />
                      <Text style={styles.modalFeatureText}>Easy to use</Text>
                    </View>
                    <View style={styles.modalFeatureItem}>
                      <Ionicons name="checkmark-circle" size={18} color={selectedFeature.color} />
                      <Text style={styles.modalFeatureText}>Cute interface</Text>
                    </View>
                    <View style={styles.modalFeatureItem}>
                      <Ionicons name="checkmark-circle" size={18} color={selectedFeature.color} />
                      <Text style={styles.modalFeatureText}>Made with love</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                    <Text style={styles.modalCloseText}>Got it!</Text>
                    <Ionicons name="heart" size={16} color={StudyBloomColors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  decorCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: StudyBloomColors.tertiary + '20',
  },
  decorCircle2: {
    position: 'absolute',
    top: 200,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: StudyBloomColors.secondary + '15',
  },
  decorCircle3: {
    position: 'absolute',
    bottom: 300,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: StudyBloomColors.primary + '10',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logoIconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,128,171,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: StudyBloomColors.primary,
    letterSpacing: 1,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  tagline: {
    fontSize: 15,
    color: StudyBloomColors.gray,
    fontStyle: 'italic',
  },
  welcomeCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: StudyBloomColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  welcomeGradient: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  featuresSection: {
    paddingHorizontal: 20,
  },
  sectionTitleContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: StudyBloomColors.black,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 52) / 2,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  featureGradient: {
    padding: 18,
    alignItems: 'center',
    minHeight: 150,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: StudyBloomColors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureShortDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  tapHintText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  motivationalSection: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  motivationalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  motivationalText: {
    fontSize: 15,
    color: StudyBloomColors.white,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  flowerDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  statsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: StudyBloomColors.white,
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: StudyBloomColors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: StudyBloomColors.gray,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: StudyBloomColors.lightGray,
  },
  authContainer: {
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  signInButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  signInButtonText: {
    color: StudyBloomColors.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signUpButton: {
    flexDirection: 'row',
    backgroundColor: StudyBloomColors.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: StudyBloomColors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signUpButtonText: {
    color: StudyBloomColors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: StudyBloomColors.primary,
    fontWeight: '500',
  },
  bottomDecor: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: StudyBloomColors.white,
    borderRadius: 28,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    padding: 28,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: StudyBloomColors.white,
    textAlign: 'center',
  },
  modalBody: {
    padding: 24,
  },
  modalDescription: {
    fontSize: 15,
    color: StudyBloomColors.gray,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalFeatures: {
    marginBottom: 20,
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalFeatureText: {
    fontSize: 14,
    color: StudyBloomColors.black,
    fontWeight: '500',
  },
  modalCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: StudyBloomColors.neutral,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: StudyBloomColors.primary,
  },
});
