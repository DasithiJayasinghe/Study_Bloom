import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { blossomApi } from '@/services/blossomApi';
import { useAuth } from '@/contexts/AuthContext';
import { localDateKey } from '@/utils/localDateKey';

export type MoodId = 'stressed' | 'sad' | 'meh' | 'happy' | 'amazing';

export const BLOSSOM_MOODS: { id: MoodId; label: string; emoji: string }[] = [
  { id: 'stressed', label: 'Stressed', emoji: '😰' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'meh', label: 'Meh', emoji: '😐' },
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'amazing', label: 'Amazing', emoji: '🤩' },
];

export type MoodLogEntry = {
  id: string;
  moodId: MoodId;
  note: string;
  timeLabel: string;
  /** Local calendar day for “today” filtering (device timezone). */
  dateKey: string;
};

function makeSeedLog(): MoodLogEntry[] {
  const today = localDateKey();
  return [
    {
      id: 'seed-1',
      moodId: 'amazing',
      note: 'Aced my quiz!',
      timeLabel: '9:15 AM',
      dateKey: today,
    },
    {
      id: 'seed-2',
      moodId: 'happy',
      note: 'Productive day',
      timeLabel: '3:40 PM',
      dateKey: today,
    },
  ];
}

function formatTimeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

type BlossomMoodContextValue = {
  log: MoodLogEntry[];
  /** Entries for the current local calendar day only (mood log UI). */
  todayLog: MoodLogEntry[];
  /** Newest mood entry for the current local calendar day (for dashboard / “today”). */
  latestMood: MoodLogEntry | null;
  addMoodEntry: (moodId: MoodId, note: string) => void;
};

const BlossomMoodContext = createContext<BlossomMoodContextValue | undefined>(undefined);

export function BlossomMoodProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [log, setLog] = useState<MoodLogEntry[]>(makeSeedLog);
  const [calendarDayKey, setCalendarDayKey] = useState(() => localDateKey());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const t = localDateKey();
        setCalendarDayKey((prev) => (prev === t ? prev : t));
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLog(makeSeedLog());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await blossomApi.getMoodEntries();
        if (cancelled) return;
        const mapped: MoodLogEntry[] = rows.map((r) => ({
          id: r.id,
          moodId: r.moodId as MoodId,
          note: r.note || 'Mood check-in',
          timeLabel: formatTimeLabel(r.createdAt),
          dateKey: localDateKey(new Date(r.createdAt)),
        }));
        setLog(mapped.length ? mapped : []);
      } catch (e) {
        console.warn('[BlossomMood] fetch', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  /** Logged-out demo: refresh seed “today” when the calendar day changes. */
  useEffect(() => {
    if (isAuthenticated) return;
    setLog(makeSeedLog());
  }, [calendarDayKey, isAuthenticated]);

  const addMoodEntry = useCallback(
    async (moodId: MoodId, note: string) => {
      const trimmed = note.trim();
      const text = trimmed || 'Mood check-in';
      const dk = localDateKey();
      const timeLabel = formatTimeLabel(new Date().toISOString());

      if (!isAuthenticated) {
        const entry: MoodLogEntry = {
          id: `${Date.now()}`,
          moodId,
          note: text,
          timeLabel,
          dateKey: dk,
        };
        setLog((prev) => [entry, ...prev]);
        return;
      }

      try {
        const data = await blossomApi.postMoodEntry(moodId, trimmed);
        const entry: MoodLogEntry = {
          id: data.id,
          moodId,
          note: text,
          timeLabel: formatTimeLabel(data.createdAt),
          dateKey: localDateKey(new Date(data.createdAt)),
        };
        setLog((prev) => [entry, ...prev]);
      } catch (e) {
        console.warn('[BlossomMood] save', e);
        const msg = e instanceof Error ? e.message : 'Could not reach the server';
        Alert.alert(
          'Mood not saved',
          `${msg}\n\nYour mood entry was not saved to the database.`
        );
      }
    },
    [isAuthenticated]
  );

  const todayLog = useMemo(() => {
    const today = calendarDayKey;
    return log.filter((e) => e.dateKey === today);
  }, [log, calendarDayKey]);

  const latestMood = useMemo(() => {
    const today = calendarDayKey;
    return todayLog[0] ?? null;
  }, [todayLog, calendarDayKey]);

  return (
    <BlossomMoodContext.Provider value={{ log, todayLog, latestMood, addMoodEntry }}>
      {children}
    </BlossomMoodContext.Provider>
  );
}

export function useBlossomMood() {
  const ctx = useContext(BlossomMoodContext);
  if (ctx === undefined) {
    throw new Error('useBlossomMood must be used within BlossomMoodProvider');
  }
  return ctx;
}
