import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { fetchWithTimeout } from '../utils/apiFetch';
import { authService } from './authService';
import { Platform } from 'react-native';

const API_URL = getApiBaseUrl();

export const chatService = {
  async getContacts(role?: 'requester' | 'responder') {
    const token = await authService.getToken();
    if (!token) throw new Error('No authentication token');

    const queryParams = role ? `?role=${role}` : '';
    const response = await fetchWithTimeout(`${API_URL}/chat/contacts${queryParams}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch contacts');
    return data;
  },

  async getMessages(roomId: string) {
    const token = await authService.getToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetchWithTimeout(`${API_URL}/chat/${roomId}/messages`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch messages');
    return data;
  },

  async sendMessage(roomId: string, text: string, files?: any[]) {
    const token = await authService.getToken();
    if (!token) throw new Error('No authentication token');

    const formData = new FormData();
    if (text) {
      formData.append('text', text);
    }
    
    if (files && files.length > 0) {
      for (const file of files) {
        if (Platform.OS === 'web') {
          // On web, if we have the native File object, use it directly
          if (file.file) {
            formData.append('files', file.file);
          } else {
            // Fallback: if we only have a blob URI, we might need to fetch it (less ideal)
            try {
              const response = await fetch(file.uri);
              const blob = await response.blob();
              formData.append('files', blob, file.name || 'upload');
            } catch (e) {
              console.error('Failed to append blob for web:', e);
            }
          }
        } else {
          // Mobile handling
          let uri = file.uri;
          if (Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
            uri = 'file://' + uri;
          }
          
          const name = file.name || uri.split('/').pop() || 'upload';
          const type = file.mimeType || 'application/octet-stream';

          // @ts-ignore - React Native structure
          formData.append('files', {
            uri,
            name,
            type,
          });
        }
      }
    }

    const response = await fetchWithTimeout(`${API_URL}/chat/${roomId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send message');
    return data;
  },

  async updateStatus(roomId: string, status: 'pending' | 'complete') {
    const token = await authService.getToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetchWithTimeout(`${API_URL}/chat/${roomId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update status');
    return data;
  }
};
