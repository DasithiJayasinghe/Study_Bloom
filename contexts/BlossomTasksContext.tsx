import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { blossomApi } from '@/services/blossomApi';
import { useAuth } from '@/contexts/AuthContext';

export type TaskCategory = 'study' | 'life' | 'health';

export type BlossomTaskItem = {
  id: string;
  title: string;
  category: TaskCategory;
  done: boolean;
};

const SEED_TASKS: BlossomTaskItem[] = [
  { id: '1', title: 'Submit SE2020 assignment', category: 'study', done: false },
  { id: '2', title: 'Go for a 20 min walk', category: 'health', done: false },
  { id: '3', title: 'Call mum', category: 'life', done: true },
];

/** Avoid losing in-flight adds when GET /tasks completes after POST or while a temp row exists. */
function mergeTasksFromServer(
  server: BlossomTaskItem[],
  prev: BlossomTaskItem[]
): BlossomTaskItem[] {
  const pending = prev.filter((t) => t.id.startsWith('temp-'));
  if (pending.length === 0) return server;
  const superseded = new Set(
    pending
      .filter((p) =>
        server.some((s) => s.title === p.title && s.category === p.category && s.done === p.done)
      )
      .map((p) => p.id)
  );
  const keep = pending.filter((p) => !superseded.has(p.id));
  return [...server, ...keep];
}

type BlossomTasksContextValue = {
  tasks: BlossomTaskItem[];
  incompleteCount: number;
  addTask: (title: string, category: TaskCategory) => void;
  toggleTaskDone: (id: string) => void;
  removeTask: (id: string) => void;
};

const BlossomTasksContext = createContext<BlossomTasksContextValue | undefined>(undefined);

export function BlossomTasksProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<BlossomTaskItem[]>(SEED_TASKS);

  useEffect(() => {
    if (!isAuthenticated) {
      setTasks(SEED_TASKS);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await blossomApi.getTasks();
        if (cancelled) return;
        const mapped: BlossomTaskItem[] = rows.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category as TaskCategory,
          done: t.done,
        }));
        setTasks((prev) => mergeTasksFromServer(mapped, prev));
      } catch (e) {
        console.warn('[BlossomTasks] fetch', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const incompleteCount = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);

  const addTask = useCallback(
    async (title: string, category: TaskCategory) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      if (!isAuthenticated) {
        setTasks((prev) => [
          ...prev,
          { id: `${Date.now()}`, title: trimmed, category, done: false },
        ]);
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const optimistic: BlossomTaskItem = {
        id: tempId,
        title: trimmed,
        category,
        done: false,
      };
      setTasks((prev) => [...prev, optimistic]);
      try {
        const data = await blossomApi.postTask({ title: trimmed, category });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === tempId
              ? { id: data.id, title: data.title, category: data.category as TaskCategory, done: data.done }
              : t
          )
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not reach the server';
        console.warn('[BlossomTasks] add', e);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        Alert.alert(
          'Task not saved',
          `${msg}\n\nThe task was not saved to the database, so it has been removed from the list.`
        );
      }
    },
    [isAuthenticated]
  );

  const toggleTaskDone = useCallback(
    async (id: string) => {
      const target = tasks.find((t) => t.id === id);
      if (!target || id.startsWith('temp-')) return;
      const nextDone = !target.done;

      if (!isAuthenticated) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));
        return;
      }

      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));
      try {
        await blossomApi.patchTask(id, { done: nextDone });
      } catch (e) {
        console.warn('[BlossomTasks] toggle', e);
        setTasks((prev) => prev.map((t) => (t.id === id ? target : t)));
      }
    },
    [tasks, isAuthenticated]
  );

  const removeTask = useCallback(
    async (id: string) => {
      const prev = tasks;
      if (!isAuthenticated) {
        setTasks((t) => t.filter((x) => x.id !== id));
        return;
      }
      setTasks((t) => t.filter((x) => x.id !== id));
      try {
        await blossomApi.deleteTask(id);
      } catch (e) {
        console.warn('[BlossomTasks] delete', e);
        setTasks(prev);
      }
    },
    [tasks, isAuthenticated]
  );

  return (
    <BlossomTasksContext.Provider
      value={{ tasks, incompleteCount, addTask, toggleTaskDone, removeTask }}
    >
      {children}
    </BlossomTasksContext.Provider>
  );
}

export function useBlossomTasks() {
  const ctx = useContext(BlossomTasksContext);
  if (ctx === undefined) {
    throw new Error('useBlossomTasks must be used within BlossomTasksProvider');
  }
  return ctx;
}
