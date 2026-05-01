import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { StudyBloomColors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { feedbackService } from '@/services/feedbackService';

export default function ProfileScreen() {
  const { user, updateProfile, updatePassword, logout, profileImage, setProfileImage } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  const fetchFeedback = useCallback(async () => {
    try {
      setLoadingFeedback(true);
      const userId = user?.id || (user as any)?._id;
      if (!userId) {
        setFeedbacks([]);
        setStats({ average: 0, count: 0 });
        return;
      }
      const data = await feedbackService.getResponderFeedback(userId);
      setFeedbacks(data.feedbacks);
      setStats(data.ratingStats);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchFeedback();
    }, [fetchFeedback])
  );

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to select a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your camera to take a profile picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        ...(profileImage ? [{ text: 'Remove Photo', onPress: () => setProfileImage(null), style: 'destructive' as const }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateProfile({ fullName: fullName.trim(), email: email.trim() });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword, confirmPassword });
      Alert.alert('Success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/landing');
          },
        },
      ]
    );
  };

  const renderFeedback = (item: any) => (
    <View key={item._id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
           <Ionicons name="person" size={16} color={StudyBloomColors.primary} />
        </View>
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewerName}>{item.requester?.fullName || 'Student'}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons 
                key={star} 
                name={star <= item.rating ? "star" : "star-outline"} 
                size={12} 
                color="#FFC107" 
              />
            ))}
          </View>
        </View>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.comment}>{item.comment}</Text>
    </View>
  );

  const firstName = user?.fullName?.split(' ')[0] || 'User';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F8" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={StudyBloomColors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={showImageOptions}>
              <Ionicons name="camera" size={16} color={StudyBloomColors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          {stats.count > 0 && (
            <View style={styles.profileStats}>
              <Ionicons name="star" size={16} color="#FFC107" />
              <Text style={styles.statText}>{stats.average.toFixed(1)} Rating</Text>
              <Text style={styles.statDivider}>•</Text>
              <Text style={styles.statText}>{stats.count} reviews</Text>
            </View>
          )}
        </View>

        {/* Profile Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={StudyBloomColors.primary} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={StudyBloomColors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your name"
                  placeholderTextColor={StudyBloomColors.lightGray}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={StudyBloomColors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={StudyBloomColors.lightGray}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
              disabled={isUpdatingProfile}
            >
              <LinearGradient
                colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {isUpdatingProfile ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color={StudyBloomColors.primary} />
            <Text style={styles.sectionTitle}>My Reviews</Text>
          </View>
          <View style={styles.reviewsList}>
             {loadingFeedback ? (
               <ActivityIndicator color={StudyBloomColors.primary} style={styles.reviewsLoader} />
             ) : feedbacks.length > 0 ? (
               feedbacks.slice(0, 3).map(renderFeedback)
             ) : (
               <View style={styles.emptyReviewCard}>
                 <View style={styles.emptyReviewIcon}>
                   <Ionicons name="sparkles-outline" size={18} color={StudyBloomColors.primary} />
                 </View>
                 <Text style={styles.emptyReviewTitle}>No reviews yet</Text>
                 <Text style={styles.emptyReviewText}>
                   Completed student feedback will appear here after resolved chats are reviewed.
                 </Text>
               </View>
             )}
             {!loadingFeedback && feedbacks.length > 3 && (
               <TouchableOpacity style={styles.viewMoreBtn}>
                  <Text style={styles.viewMoreText}>View all {feedbacks.length} reviews</Text>
               </TouchableOpacity>
             )}
          </View>
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={20} color={StudyBloomColors.primary} />
            <Text style={styles.sectionTitle}>Change Password</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={StudyBloomColors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={StudyBloomColors.lightGray}
                  secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  <Ionicons
                    name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={StudyBloomColors.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={StudyBloomColors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={StudyBloomColors.lightGray}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons
                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={StudyBloomColors.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={StudyBloomColors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={StudyBloomColors.lightGray}
                  secureTextEntry={!showNewPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdatePassword}
              disabled={isUpdatingPassword}
            >
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="key" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#FF6B6B" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Bottom Decoration */}
        <View style={styles.bottomDecor}>
          <Ionicons name="flower-outline" size={18} color={StudyBloomColors.tertiary} />
          <Ionicons name="heart" size={14} color={StudyBloomColors.primary} />
          <Ionicons name="flower-outline" size={18} color={StudyBloomColors.secondary} />
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
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  placeholder: {
    width: 44,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFF',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: StudyBloomColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF5F8',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  userEmail: {
    fontSize: 14,
    color: StudyBloomColors.gray,
    marginTop: 4,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFE0EA',
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  statDivider: {
    color: StudyBloomColors.lightGray,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.black,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: StudyBloomColors.black,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  reviewsList: {
    gap: 12,
  },
  reviewsLoader: {
    marginVertical: 16,
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
    color: StudyBloomColors.black,
    marginBottom: 6,
  },
  emptyReviewText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: StudyBloomColors.gray,
  },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: StudyBloomColors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dateText: {
    fontSize: 11,
    color: StudyBloomColors.gray,
  },
  comment: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  viewMoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewMoreText: {
    fontSize: 14,
    color: StudyBloomColors.primary,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  bottomDecor: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 30,
  },
});
