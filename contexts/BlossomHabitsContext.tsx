import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { blossomApi } from '@/services/blossomApi';
import { useAuth } from '@/contexts/AuthContext';
import { localDateKey } from '@/utils/localDateKey';

export type BlossomHabitItem = {
  id: string;
  title: string;
  streak: number;
  lastCompletedDate: string | null;
};

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
}

const SEED_HABITS: BlossomHabitItem[] = [
  { id: '1', title: 'Read for 15 minutes', streak: 0, lastCompletedDate: null },
  { id: '2', title: 'Stretch before bed', streak: 0, lastCompletedDate: null },
];

function mergeHabitsFromServer(server: BlossomHabitItem[], prev: BlossomHabitItem[]): BlossomHabitItem[] {
  const pending = prev.filter((h) => h.id.startsWith('temp-'));
  if (pending.length === 0) return server;
  const keep = pending.filter((p) => !server.some((s) => s.title === p.title));
  return [...server, ...keep];
}

type BlossomHabitsContextValue = {
  habits: BlossomHabitItem[];
  addHabit: (title: string) => void;
  removeHabit: (id: string) => void;
  toggleToday: (id: string) => void;
};

const BlossomHabitsContext = createContext<BlossomHabitsContextValue | undefined>(undefined);

export function BlossomHabitsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [habits, setHabits] = useState<BlossomHabitItem[]>(SEED_HABITS);

  useEffect(() => {
    if (!isAuthenticated) {
      setHabits(SEED_HABITS);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await blossomApi.getHabits();
        if (cancelled) return;
        const mapped: BlossomHabitItem[] = rows.map((h) => ({
          id: h.id,
          title: h.title,
          streak: h.streak,
          lastCompletedDate: h.lastCompletedDate,
        }));
        setHabits((prev) => mergeHabitsFromServer(mapped, prev));
      } catch (e) {
        console.warn('[BlossomHabits] fetch', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const addHabit = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      if (!isAuthenticated) {
        setHabits((prev) => [
          ...prev,
          { id: `${Date.now()}`, title: trimmed, streak: 0, lastCompletedDate: null },
        ]);
        return;
      }

      const optimistic: BlossomHabitItem = {
        id: `temp-${Date.now()}`,
        title: trimmed,
        streak: 0,
        lastCompletedDate: null,
      };
      setHabits((prev) => [...prev, optimistic]);
      try {
        const data = await blossomApi.postHabit({ title: trimmed });
        setHabits((prev) =>
          prev.map((h) => (h.id === optimistic.id ? { ...h, id: data.id, title: data.title } : h))
        );
      } catch (e) {
        console.warn('[BlossomHabits] add', e);
        setHabits((prev) => prev.filter((h) => h.id !== optimistic.id));
      }
    },
    [isAuthenticated]
  );

  const removeHabit = useCallback(
    async (id: string) => {
      const prev = habits;
      if (!isAuthenticated) {
        setHabits((h) => h.filter((x) => x.id !== id));
        return;
      }
      setHabits((h) => h.filter((x) => x.id !== id));
      try {
        await blossomApi.deleteHabit(id);
      } catch (e) {
        console.warn('[BlossomHabits] delete', e);
        setHabits(prev);
      }
    },
    [habits, isAuthenticated]
  );

  const toggleToday = useCallback(
    async (id: string) => {
      const today = localDateKey();
      const y = yesterdayKey();

      const computeNext = (h: BlossomHabitItem): BlossomHabitItem => {
        if (h.id !== id) return h;
        if (h.lastCompletedDate === today) {
          return {
            ...h,
            lastCompletedDate: null,
            streak: Math.max(0, h.streak - 1),
          };
        }
        let nextStreak = 1;
        if (h.lastCompletedDate === y) {
          nextStreak = h.streak + 1;
        }
        return { ...h, lastCompletedDate: today, streak: nextStreak };
      };

      if (!isAuthenticated) {
        setHabits((prev) => prev.map(computeNext));
        return;
      }

      const target = habits.find((h) => h.id === id);
      if (!target || id.startsWith('temp-')) return;
      const next = computeNext(target);

      setHabits((prev) => prev.map((h) => (h.id === id ? next : h)));
      try {
        await blossomApi.patchHabit(id, {
          streak: next.streak,
          lastCompletedDate: next.lastCompletedDate,
        });
      } catch (e) {
        console.warn('[BlossomHabits] patch', e);
        setHabits((prev) => prev.map((h) => (h.id === id ? target : h)));
      }
    },
    [habits, isAuthenticated]
  );

  const value = useMemo(
    () => ({ habits, addHabit, removeHabit, toggleToday }),
    [habits, addHabit, removeHabit, toggleToday]
  );

  return <BlossomHabitsContext.Provider value={value}>{children}</BlossomHabitsContext.Provider>;
}

export function useBlossomHabits() {
  const ctx = useContext(BlossomHabitsContext);
  if (ctx === undefined) {
    throw new Error('useBlossomHabits must be used within BlossomHabitsProvider');
  }
  return ctx;
}
