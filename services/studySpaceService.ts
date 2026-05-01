import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'studybloom_token';

export interface Folder {
    _id: string;
    name: string;
    icon: string;
    color: string;
    isDefault?: boolean;
}

export interface Attachment {
    name: string;
    url: string;
    fileType: string;
}

export interface StudyGem {
    _id: string;
    title: string;
    description?: string;
    notes?: string;
    folder: string | Folder;
    type: 'community' | 'manual';
    tags: string[];
    attachments: Attachment[];
    pollData?: {
        optionText: string;
        voteCount: number;
    }[];
    createdAt: string;
}

export interface CreateGemData {
    title: string;
    description?: string;
    notes?: string;
    folderId: string;
    type: 'community' | 'manual';
    tags?: string[];
    attachments?: Attachment[];
    pollData?: {
        optionText: string;
        voteCount: number;
    }[];
}

export const studySpaceService = {
    async getToken(): Promise<string | null> {
        return await AsyncStorage.getItem(TOKEN_KEY);
    },

    async getAuthHeaders() {
        const token = await this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
    },

    // Folder APIs
    async getFolders(): Promise<Folder[]> {
        const response = await fetch(`${API_URL}/personal-folders`, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch folders');
        return data.data;
    },

    async getFolder(id: string): Promise<Folder> {
        const response = await fetch(`${API_URL}/personal-folders/${id}`, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch folder');
        return data.data;
    },

    async createFolder(folderData: { name: string; icon: string; color: string }): Promise<Folder> {
        const response = await fetch(`${API_URL}/personal-folders`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(folderData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create folder');
        return data.data;
    },

    async updateFolder(id: string, folderData: { name?: string; icon?: string; color?: string }): Promise<Folder> {
        const response = await fetch(`${API_URL}/personal-folders/${id}`, {
            method: 'PUT',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(folderData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update folder');
        return data.data;
    },

    async deleteFolder(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/personal-folders/${id}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete folder');
    },

    // Gem APIs
    async getStudyGems(folderId?: string): Promise<StudyGem[]> {
        const url = folderId ? `${API_URL}/gems?folderId=${folderId}` : `${API_URL}/gems`;
        const response = await fetch(url, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch gems');
        return data.data;
    },

    async getStudyGem(id: string): Promise<StudyGem> {
        const response = await fetch(`${API_URL}/gems/${id}`, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch gem');
        return data.data;
    },

    async createStudyGem(gemData: CreateGemData): Promise<StudyGem> {
        const response = await fetch(`${API_URL}/gems`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(gemData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create study gem');
        return data.data;
    },

    async updateStudyGem(id: string, gemData: Partial<CreateGemData>): Promise<StudyGem> {
        const response = await fetch(`${API_URL}/gems/${id}`, {
            method: 'PUT',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(gemData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update study gem');
        return data.data;
    },

    async deleteStudyGem(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/gems/${id}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete study gem');
    },

    // Session APIs
    async saveStudySession(sessionData: {
        duration: number;
        folderId?: string;
        startTime: string;
        endTime: string;
    }): Promise<any> {
        const response = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(sessionData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to save study session');
        return data.data;
    },

    async getSessionStats(): Promise<{
        todayTotalSeconds: number;
        statsByFolder: any[];
        monthlyStats: { month: string; hours: number }[]
    }> {
        const response = await fetch(`${API_URL}/sessions/stats`, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch session stats');
        return data.data;
    },

    async getDailyStatsForMonth(year: number, month: number): Promise<{ day: number; hours: number }[]> {
        const response = await fetch(`${API_URL}/sessions/stats/daily?year=${year}&month=${month}`, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch daily stats');
        return data.data;
    },

    async getWeeklyStats(): Promise<{ weeklyData: any[]; totalHours: number; goalReach: number }> {
        const response = await fetch(`${API_URL}/sessions/stats/weekly`, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            if (!response.ok) throw new Error(data.message || 'Failed to fetch weekly stats');
            return data.data;
        } catch (e) {
            console.error('DIARY API ERROR (WEEKLY):', text.substring(0, 500));
            throw new Error('Server returned non-JSON response. Check backend console.');
        }
    },

    async getMonthlyStats(): Promise<{ monthlyData: any[]; totalHours: number }> {
        const response = await fetch(`${API_URL}/sessions/stats/monthly`, {
            method: 'GET',
            headers: await this.getAuthHeaders(),
        });

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            if (!response.ok) throw new Error(data.message || 'Failed to fetch monthly stats');
            return data.data;
        } catch (e) {
            console.error('DIARY API ERROR (MONTHLY):', text.substring(0, 500));
            throw new Error('Server returned non-JSON response. Check backend console.');
        }
    },
};
