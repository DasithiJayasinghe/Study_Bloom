import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { blossomApi } from '@/services/blossomApi';
import { localDateKey } from '@/utils/localDateKey';
import { useAuth } from '@/contexts/AuthContext';

export const BLOSSOM_WATER_GOAL_ML = 2000;

type BlossomWaterContextValue = {
  ml: number;
  setWaterMl: (value: number) => void;
  resetWater: () => void;
  /** Current local calendar day — changes at midnight; use to sync animations */
  calendarDayKey: string;
};

const BlossomWaterContext = createContext<BlossomWaterContextValue | undefined>(undefined);

function clampMl(value: number): number {
  return Math.min(BLOSSOM_WATER_GOAL_ML, Math.max(0, value));
}

export function BlossomWaterProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [ml, setMl] = useState(0);
  const [calendarDayKey, setCalendarDayKey] = useState(() => localDateKey());
  const skipNextPut = useRef(true);
  const prevDayKeyRef = useRef<string | null>(null);

  const fetchForDay = useCallback(
    async (dk: string) => {
      if (!isAuthenticated) return;
      try {
        const { totalMl } = await blossomApi.getWaterDaily(dk);
        setMl(clampMl(totalMl));
      } catch (e) {
        console.warn('[BlossomWater] fetch', e);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      skipNextPut.current = false;
      return;
    }
    const crossedMidnight =
      prevDayKeyRef.current !== null && prevDayKeyRef.current !== calendarDayKey;
    prevDayKeyRef.current = calendarDayKey;
    skipNextPut.current = true;
    if (crossedMidnight) setMl(0);
    fetchForDay(calendarDayKey).finally(() => {
      skipNextPut.current = false;
    });
  }, [calendarDayKey, isAuthenticated, fetchForDay]);

  useEffect(() => {
    if (isAuthenticated) return;
    setMl(1900);
  }, [isAuthenticated]);

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
    if (!isAuthenticated || skipNextPut.current) return;
    const t = setTimeout(() => {
      blossomApi.putWaterDaily(calendarDayKey, ml).catch(async (e) => {
        console.warn('[BlossomWater] sync', e);
        try {
          const { totalMl } = await blossomApi.getWaterDaily(calendarDayKey);
          setMl(clampMl(totalMl));
        } catch (fetchErr) {
          console.warn('[BlossomWater] rollback fetch', fetchErr);
        }
        const msg = e instanceof Error ? e.message : 'Could not reach the server';
        Alert.alert(
          'Water not saved',
          `${msg}\n\nYour water update could not be saved to the database.`
        );
      });
    }, 600);
    return () => clearTimeout(t);
  }, [ml, calendarDayKey, isAuthenticated]);

  const setWaterMl = useCallback((value: number) => {
    setMl(clampMl(value));
  }, []);

  const resetWater = useCallback(() => {
    setMl(0);
  }, []);

  return (
    <BlossomWaterContext.Provider
      value={{ ml, setWaterMl, resetWater, calendarDayKey }}
    >
      {children}
    </BlossomWaterContext.Provider>
  );
}

export function useBlossomWater() {
  const ctx = useContext(BlossomWaterContext);
  if (ctx === undefined) {
    throw new Error('useBlossomWater must be used within BlossomWaterProvider');
  }
  return ctx;
}
