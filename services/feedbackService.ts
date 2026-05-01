import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { fetchWithTimeout } from '../utils/apiFetch';
import { authService } from './authService';

const API_URL = getApiBaseUrl();

export interface FeedbackSubmission {
  chatRoomId: string;
  rating: number;
  comment?: string;
}

export const feedbackService = {
  async submitFeedback(feedbackData: FeedbackSubmission) {
    const token = await authService.getToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetchWithTimeout(`${API_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(feedbackData),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to submit feedback');
    return data;
  },

  async getResponderFeedback(userId: string) {
    const token = await authService.getToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetchWithTimeout(`${API_URL}/feedback/responder/${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch responder feedback');
    return data;
  }
};