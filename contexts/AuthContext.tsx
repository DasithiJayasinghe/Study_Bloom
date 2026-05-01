import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User, LoginCredentials, RegisterCredentials, UpdateProfileData, UpdatePasswordData } from '@/services/authService';
import { notificationService } from '@/services/notificationService';

const PROFILE_IMAGE_KEY = 'profile_image';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  profileImage: string | null;
  setProfileImage: (uri: string | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  updatePassword: (data: UpdatePasswordData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImageState] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedUser = await authService.getUser();
      const token = await authService.getToken();
      const storedProfileImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);

      if (storedUser && token) {
        setUser(storedUser);
        if (storedProfileImage) {
          setProfileImageState(storedProfileImage);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setProfileImage = async (uri: string | null) => {
    setProfileImageState(uri);
    try {
      if (uri) {
        await AsyncStorage.setItem(PROFILE_IMAGE_KEY, uri);
      } else {
        await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving profile image:', error);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    // Load profile image after login
    const storedProfileImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
    if (storedProfileImage) {
      setProfileImageState(storedProfileImage);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    const response = await authService.register(credentials);
    setUser(response.user);
  };

  const logout = async () => {
    await authService.logout();
    await notificationService.clearLocalNotifications();
    setUser(null);
    setProfileImageState(null);
  };

  const updateProfile = async (data: UpdateProfileData) => {
    const updatedUser = await authService.updateProfile(data);
    setUser(updatedUser);
  };

  const updatePassword = async (data: UpdatePasswordData) => {
    await authService.updatePassword(data);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    profileImage,
    setProfileImage,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
