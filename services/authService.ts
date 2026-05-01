import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';
import { fetchWithTimeout } from '@/utils/apiFetch';

const API_URL = getApiBaseUrl();

export interface User {
  id: string;
  fullName: string;
  email: string;
  profilePicture: string | null;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const TOKEN_KEY = 'studybloom_token';
const USER_KEY = 'studybloom_user';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    await this.storeAuthData(data.token, data.user);
    return data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await fetchWithTimeout(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    await this.storeAuthData(data.token, data.user);
    return data;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async getUser(): Promise<User | null> {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  async storeAuthData(token: string, user: User): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },

  async getProfile(): Promise<User> {
    const token = await this.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetchWithTimeout(`${API_URL}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch profile');
    }

    return data.user;
  },

  async updateProfile(profileData: UpdateProfileData): Promise<User> {
    const token = await this.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetchWithTimeout(`${API_URL}/auth/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    // Update stored user data
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));

    return data.user;
  },

  async updatePassword(passwordData: UpdatePasswordData): Promise<void> {
    const token = await this.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetchWithTimeout(`${API_URL}/auth/update-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update password');
    }
  },
};
