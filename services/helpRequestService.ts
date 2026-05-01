import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';
import { HelpRequest } from './helpRequestTypes';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

async function getSeenHelpFeedStorageKey(): Promise<string> {
  const user = await authService.getUser();
  const userKey = user?.id || user?.email || 'guest';
  return `seen_help_feed_ids_${userKey}`;
}

export const helpRequestService = {
  async getMyHelpRequests(): Promise<HelpRequest[]> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/help-requests/my`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : [];

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch help requests');
    }

    return data;
  },

  async getHelpFeed(): Promise<HelpRequest[]> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/help-requests/feed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : [];

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch help feed');
    }

    return data;
  },

  async getHelpRequestById(requestId: string): Promise<HelpRequest> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/help-requests/${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch help request details');
    }

    return data;
  },

  async acceptHelpRequest(requestId: string): Promise<any> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/help-requests/${requestId}/accept`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || 'Failed to accept help request');
    }

    return data;
  },

  async createHelpRequest(formData: FormData): Promise<HelpRequest> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/help-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create help request');
    }

    return data;
  },

  async deleteHelpRequest(requestId: string): Promise<void> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/help-requests/${requestId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete help request');
    }
  },

  async getSeenHelpFeedIds(): Promise<string[]> {
  try {
    const storageKey = await getSeenHelpFeedStorageKey();
    const data = await AsyncStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
},

async markHelpFeedRequestsAsSeen(requestIds: string[]): Promise<void> {
  try {
    const storageKey = await getSeenHelpFeedStorageKey();
    const existing = await this.getSeenHelpFeedIds();
    const merged = Array.from(new Set([...existing, ...requestIds]));
    await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
  } catch (error) {
    console.error('Failed to mark help feed requests as seen:', error);
  }
},

async getUnseenHelpFeedCount(): Promise<number> {
  try {
    const feed = await this.getHelpFeed();
    const seenIds = await this.getSeenHelpFeedIds();

    const unseen = feed.filter((item) => item?._id && !seenIds.includes(item._id));
    return unseen.length;
  } catch (error) {
    console.error('Failed to get unseen help feed count:', error);
    return 0;
  }
},
};
