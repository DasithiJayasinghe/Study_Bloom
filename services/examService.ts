import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';
import { fetchWithTimeout } from '@/utils/apiFetch';
import {
  Exam,
  ExamFormData,
  ExamsResponse,
  ExamResponse,
  CalendarResponse,
  ExamFilter,
  ExamSortBy,
  SortOrder,
  FileAttachment,
  ExamMark,
} from './examTypes';

const API_URL = getApiBaseUrl();

const getAuthHeaders = async (): Promise<HeadersInit> => {
  const token = await AsyncStorage.getItem('studybloom_token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const getAuthHeadersFormData = async (): Promise<HeadersInit> => {
  const token = await AsyncStorage.getItem('studybloom_token');
  return {
    Authorization: token ? `Bearer ${token}` : '',
  };
};

// Helper to safely parse JSON response
const parseResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    // If it's not JSON, the server might be down or returning HTML
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error('Cannot connect to server. Please check your network connection.');
    }
    if (text.length === 0) {
      throw new Error('Server returned empty response');
    }
    throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
  }
};

export const examService = {
  // Get all exams with optional filters
  async getExams(
    search?: string,
    filter?: ExamFilter,
    sortBy?: ExamSortBy,
    sortOrder?: SortOrder
  ): Promise<Exam[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (filter && filter !== 'all') params.append('filter', filter);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    const queryString = params.toString();
    const url = `${API_URL}/exams${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch exams');
      }

      return data.exams || [];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Get single exam
  async getExam(id: string): Promise<Exam> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams/${id}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch exam');
      }

      return data.exam;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Create exam
  async createExam(examData: ExamFormData): Promise<Exam> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          ...examData,
          date: examData.date.toISOString(),
        }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create exam');
      }

      return data.exam;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Update exam
  async updateExam(id: string, examData: Partial<ExamFormData>): Promise<Exam> {
    try {
      const payload = {
        ...examData,
        date: examData.date ? examData.date.toISOString() : undefined,
      };

      const response = await fetchWithTimeout(`${API_URL}/exams/${id}`, {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update exam');
      }

      return data.exam;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Delete exam
  async deleteExam(id: string): Promise<void> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete exam');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Update progress
  async updateProgress(id: string, progress: number): Promise<Exam> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams/${id}/progress`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ progress }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update progress');
      }

      return data.exam;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Update exam marks
  async updateMarks(id: string, marks: { obtained: number; total: number; grade?: string }): Promise<Exam> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams/${id}/marks`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify(marks),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update marks');
      }

      return data.exam;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Get exams grouped by date for calendar
  async getExamsForCalendar(month?: number, year?: number): Promise<{ [date: string]: Exam[] }> {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const queryString = params.toString();
      const url = `${API_URL}/exams/calendar/dates${queryString ? `?${queryString}` : ''}`;

      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch calendar data');
      }

      return data.examsByDate || {};
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Upload file to exam
  async uploadFile(examId: string, fileUri: string, fileName: string, mimeType: string): Promise<FileAttachment> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);

      const response = await fetchWithTimeout(`${API_URL}/exams/${examId}/files`, {
        method: 'POST',
        headers: await getAuthHeadersFormData(),
        body: formData,
      }, 30000); // 30 second timeout for file uploads

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file');
      }

      return data.file;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Get file URL
  getFileUrl(examId: string, filename: string): string {
    return `${API_URL}/exams/${examId}/files/${filename}`;
  },

  // Get auth token for file downloads
  async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('studybloom_token');
    return token || '';
  },

  // Delete file from exam
  async deleteFile(examId: string, filename: string): Promise<void> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams/${examId}/files/${filename}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete file');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Calculate countdown to exam
  getCountdown(examDate: string | undefined, examTime: string | undefined): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
    totalMs: number;
  } | null {
    // If no date provided, return null
    if (!examDate) {
      return null;
    }
    
    // Parse the stored date (comes as ISO string in UTC)
    const storedDate = new Date(examDate);
    
    // Extract the date components from UTC
    const year = storedDate.getUTCFullYear();
    const month = storedDate.getUTCMonth();
    const day = storedDate.getUTCDate();
    
    // Parse the time
    let hours = 0, minutes = 0;
    if (examTime) {
      const timeParts = examTime.split(':').map(Number);
      hours = timeParts[0] || 0;
      minutes = timeParts[1] || 0;
    }
    
    // Create exam datetime in local timezone
    const examDateTime = new Date(year, month, day, hours, minutes, 0, 0);

    const now = new Date();
    const diff = examDateTime.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, totalMs: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days,
      hours: remainingHours,
      minutes: remainingMinutes,
      seconds,
      isPast: false,
      totalMs: diff,
    };
  },

  // Toggle repeat exam status
  async toggleRepeat(examId: string, isRepeat: boolean): Promise<Exam> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams/${examId}/repeat`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ isRepeat }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update repeat status');
      }

      return data.exam;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },

  // Create a repeat exam from an existing exam
  async createRepeatExam(examId: string): Promise<Exam> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/exams/${examId}/create-repeat`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create repeat exam');
      }

      return data.exam;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect to server');
    }
  },
};
