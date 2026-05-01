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
import {
  getLocalFileUriMap,
  removeLocalFileUri,
  setLocalFileUri,
} from '@/utils/blossomFileUriStorage';

export type LibraryCategory = 'goals' | 'habits' | 'mood';

export type FileKind = 'pdf' | 'image';

export type BlossomLibraryFile = {
  id: string;
  name: string;
  meta: string;
  emoji: string;
  tag: string;
  filter: LibraryCategory;
  uri: string | null;
  kind: FileKind;
};

function categoryTag(filter: LibraryCategory): string {
  if (filter === 'habits') return 'Habit';
  if (filter === 'goals') return 'Goal';
  return 'Mood';
}

function formatNowMeta(): string {
  return `Added · ${new Date().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

const LIBRARY_SEED: BlossomLibraryFile[] = [
  {
    id: '1',
    name: 'workout_plan.jpg',
    meta: '1.4 MB · Yesterday',
    emoji: '🖼️',
    tag: 'Habit',
    filter: 'habits',
    uri: null,
    kind: 'image',
  },
  {
    id: '2',
    name: 'meal_plan_march.pdf',
    meta: '890 KB · Mar 25',
    emoji: '📄',
    tag: 'Habit',
    filter: 'habits',
    uri: null,
    kind: 'pdf',
  },
];

function mergeFilesFromServer(
  server: BlossomLibraryFile[],
  prev: BlossomLibraryFile[]
): BlossomLibraryFile[] {
  const pending = prev.filter((f) => f.id.startsWith('temp-'));
  const keep = pending.filter(
    (p) => !server.some((s) => s.name === p.name && s.filter === p.filter && s.kind === p.kind)
  );
  const merged = server.map((s) => {
    const old = prev.find((p) => p.id === s.id);
    const uri = s.uri ?? old?.uri ?? null;
    return { ...s, uri };
  });
  return [...merged, ...keep];
}

type BlossomFilesContextValue = {
  library: BlossomLibraryFile[];
  fileCount: number;
  addLibraryFile: (
    name: string,
    emoji: string,
    filter: LibraryCategory,
    uri: string,
    kind: FileKind
  ) => void;
  removeLibraryFile: (id: string) => void;
};

const BlossomFilesContext = createContext<BlossomFilesContextValue | undefined>(undefined);

export function BlossomFilesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const [library, setLibrary] = useState<BlossomLibraryFile[]>(LIBRARY_SEED);

  useEffect(() => {
    if (!isAuthenticated) {
      setLibrary(LIBRARY_SEED);
      return;
    }
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        const uriMap = await getLocalFileUriMap(userId);
        if (cancelled) return;
        const rows = await blossomApi.getFiles();
        if (cancelled) return;
        const mapped: BlossomLibraryFile[] = rows.map((f) => ({
          id: f.id,
          name: f.name,
          meta: f.meta,
          emoji: f.emoji,
          tag: f.tag,
          filter: f.filter as LibraryCategory,
          uri: uriMap[f.id] ?? null,
          kind: f.kind as FileKind,
        }));
        setLibrary((prev) => mergeFilesFromServer(mapped, prev));
      } catch (e) {
        console.warn('[BlossomFiles] fetch', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  const fileCount = useMemo(() => library.length, [library]);

  const addLibraryFile = useCallback(
    async (name: string, emoji: string, filter: LibraryCategory, uri: string, kind: FileKind) => {
      const meta = formatNowMeta();
      const tag = categoryTag(filter);

      if (!isAuthenticated) {
        const row: BlossomLibraryFile = {
          id: `${Date.now()}`,
          name,
          meta,
          emoji,
          tag,
          filter,
          uri,
          kind,
        };
        setLibrary((prev) => [row, ...prev]);
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const optimistic: BlossomLibraryFile = {
        id: tempId,
        name,
        meta,
        emoji,
        tag,
        filter,
        uri,
        kind,
      };
      setLibrary((prev) => [optimistic, ...prev]);
      try {
        const data = await blossomApi.postFile({
          name,
          meta,
          emoji,
          tag,
          filter,
          kind,
        });
        setLibrary((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  id: data.id,
                  name: data.name,
                  meta: data.meta,
                  emoji: data.emoji,
                  tag: data.tag,
                  filter: data.filter as LibraryCategory,
                  uri,
                  kind: data.kind as FileKind,
                }
              : f
          )
        );
        if (userId) {
          try {
            await setLocalFileUri(userId, data.id, uri);
          } catch {
            /* ignore storage errors */
          }
        }
      } catch (e) {
        console.warn('[BlossomFiles] add', e);
        setLibrary((prev) => prev.filter((f) => f.id !== tempId));
      }
    },
    [isAuthenticated, userId]
  );

  const removeLibraryFile = useCallback(
    async (id: string) => {
      const prev = library;
      if (!isAuthenticated) {
        setLibrary((lib) => lib.filter((f) => f.id !== id));
        return;
      }
      if (id.startsWith('temp-')) {
        setLibrary((lib) => lib.filter((f) => f.id !== id));
        return;
      }
      setLibrary((lib) => lib.filter((f) => f.id !== id));
      try {
        await blossomApi.deleteFile(id);
        if (userId) {
          try {
            await removeLocalFileUri(userId, id);
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn('[BlossomFiles] delete', e);
        setLibrary(prev);
      }
    },
    [library, isAuthenticated, userId]
  );

  return (
    <BlossomFilesContext.Provider
      value={{ library, fileCount, addLibraryFile, removeLibraryFile }}
    >
      {children}
    </BlossomFilesContext.Provider>
  );
}

export function useBlossomFiles() {
  const ctx = useContext(BlossomFilesContext);
  if (ctx === undefined) {
    throw new Error('useBlossomFiles must be used within BlossomFilesProvider');
  }
  return ctx;
}
