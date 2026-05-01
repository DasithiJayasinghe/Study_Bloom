import { authService } from './authService';
import { HelpRequest } from './helpRequestTypes';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

export interface FolderItem {
  _id: string;
  user: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export const folderService = {

  async getMyFolders(): Promise<FolderItem[]> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/folders/my`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch folders');
    }

    return data;
  },

  async createFolder(name: string): Promise<FolderItem> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create folder');
    }

    return data;
  },

  async getFolderById(folderId: string): Promise<FolderItem> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/folders/${folderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch folder');
    }

    return data;
  },

  async updateFolder(folderId: string, name: string): Promise<any> {
  const token = await authService.getToken();

  if (!token) {
    throw new Error('No authentication token');
  }

  const response = await fetch(`${API_URL}/folders/${folderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update folder');
  }

  return data;
},

  async deleteFolder(folderId: string): Promise<void> {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_URL}/folders/${folderId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete folder');
    }
  },

  async getRequestsForFolder(folderId: string): Promise<HelpRequest[]> {
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

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch folder requests');
    }

    return Array.isArray(data)
      ? data.filter((item: HelpRequest) => item.folder?._id === folderId)
      : [];
  },
};