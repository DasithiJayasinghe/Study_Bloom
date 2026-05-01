import { authService } from '@/services/authService';
import { getApiBaseUrl } from '@/utils/apiBaseUrl';

async function headers(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await authService.getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || 'Request failed' };
  }
}

function throwIfHttpFailed(res: Response, data: { message?: string }, fallback: string): void {
  if (res.ok) return;
  const raw = data?.message;
  const s = typeof raw === 'string' ? raw : '';
  if (s.includes('Cannot GET') || s.includes('<!DOCTYPE')) {
    throw new Error(
      `Blossom API not found (HTTP ${res.status}). Set EXPO_PUBLIC_API_URL to http://YOUR_PC_IP:5000/api (include /api), run the backend from backend/ (npm run dev), and restart Expo with cache clear (npx expo start -c).`
    );
  }
  throw new Error(s || fallback);
}

export const blossomApi = {
  async getWaterDaily(date: string): Promise<{ totalMl: number }> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/water?date=${encodeURIComponent(date)}`, {
      headers: await headers(),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Water fetch failed');
    return data.data;
  },

  async putWaterDaily(date: string, totalMl: number): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/water`, {
      method: 'PUT',
      headers: await headers(),
      body: JSON.stringify({ date, totalMl }),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Water save failed');
  },

  async getMoodEntries(): Promise<
    { id: string; moodId: string; note: string; createdAt: string }[]
  > {
    const res = await fetch(`${getApiBaseUrl()}/blossom/mood?limit=200`, { headers: await headers() });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Mood fetch failed');
    return data.data || [];
  },

  async postMoodEntry(moodId: string, note: string): Promise<{ id: string; createdAt: string }> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/mood`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({ moodId, note }),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Mood save failed');
    return data.data;
  },

  async getTasks(): Promise<
    { id: string; title: string; category: string; done: boolean }[]
  > {
    const res = await fetch(`${getApiBaseUrl()}/blossom/tasks`, { headers: await headers() });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Tasks fetch failed');
    return data.data || [];
  },

  async postTask(body: { title: string; category: string; done?: boolean }) {
    const res = await fetch(`${getApiBaseUrl()}/blossom/tasks`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Task create failed');
    const row = data.data;
    if (!row || typeof row.id !== 'string') {
      throw new Error(data.message || 'Invalid task response from server');
    }
    return row as { id: string; title: string; category: string; done: boolean };
  },

  async patchTask(
    id: string,
    body: Partial<{ title: string; category: string; done: boolean }>
  ) {
    const res = await fetch(`${getApiBaseUrl()}/blossom/tasks/${id}`, {
      method: 'PATCH',
      headers: await headers(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Task update failed');
    return data.data as { id: string; title: string; category: string; done: boolean };
  },

  async deleteTask(id: string): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/tasks/${id}`, {
      method: 'DELETE',
      headers: await headers(),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Task delete failed');
  },

  async getHabits(): Promise<
    { id: string; title: string; streak: number; lastCompletedDate: string | null }[]
  > {
    const res = await fetch(`${getApiBaseUrl()}/blossom/habits`, { headers: await headers() });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Habits fetch failed');
    return data.data || [];
  },

  async postHabit(body: {
    title: string;
    streak?: number;
    lastCompletedDate?: string | null;
  }) {
    const res = await fetch(`${getApiBaseUrl()}/blossom/habits`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Habit create failed');
    return data.data as {
      id: string;
      title: string;
      streak: number;
      lastCompletedDate: string | null;
    };
  },

  async patchHabit(
    id: string,
    body: Partial<{ title: string; streak: number; lastCompletedDate: string | null }>
  ) {
    const res = await fetch(`${getApiBaseUrl()}/blossom/habits/${id}`, {
      method: 'PATCH',
      headers: await headers(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Habit update failed');
    return data.data as {
      id: string;
      title: string;
      streak: number;
      lastCompletedDate: string | null;
    };
  },

  async deleteHabit(id: string): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/habits/${id}`, {
      method: 'DELETE',
      headers: await headers(),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Habit delete failed');
  },

  async getFiles(): Promise<
    {
      id: string;
      name: string;
      meta: string;
      emoji: string;
      tag: string;
      filter: string;
      kind: string;
    }[]
  > {
    const res = await fetch(`${getApiBaseUrl()}/blossom/files`, { headers: await headers() });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Files fetch failed');
    return data.data || [];
  },

  async postFile(body: {
    name: string;
    meta: string;
    emoji: string;
    tag: string;
    filter: string;
    kind: string;
  }) {
    const res = await fetch(`${getApiBaseUrl()}/blossom/files`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'File save failed');
    return data.data as {
      id: string;
      name: string;
      meta: string;
      emoji: string;
      tag: string;
      filter: string;
      kind: string;
    };
  },

  async deleteFile(id: string): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/files/${id}`, {
      method: 'DELETE',
      headers: await headers(),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'File delete failed');
  },

  async getExpenses(date: string): Promise<{
    totalRupees: number;
    entries: { id: string; label: string; amountRupees: number }[];
  }> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/expenses?date=${encodeURIComponent(date)}`, {
      headers: await headers(),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Expenses fetch failed');
    return data.data;
  },

  async postExpense(body: { date: string; label: string; amountRupees: number }): Promise<{
    id: string;
    label: string;
    amountRupees: number;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/expenses`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Expense add failed');
    return data.data;
  },

  async deleteExpense(id: string): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/blossom/expenses/${id}`, {
      method: 'DELETE',
      headers: await headers(),
    });
    const data = await parseJson(res);
    throwIfHttpFailed(res, data, 'Expense delete failed');
  },
};
