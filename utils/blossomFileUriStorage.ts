import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `@studybloom/blossom_file_local_uri:${userId}`;

/** Persist local file paths — the API only stores metadata, so URIs must live on device + here. */
export async function getLocalFileUriMap(userId: string): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export async function setLocalFileUri(userId: string, fileId: string, uri: string): Promise<void> {
  const map = await getLocalFileUriMap(userId);
  map[fileId] = uri;
  await AsyncStorage.setItem(key(userId), JSON.stringify(map));
}

export async function removeLocalFileUri(userId: string, fileId: string): Promise<void> {
  const map = await getLocalFileUriMap(userId);
  delete map[fileId];
  await AsyncStorage.setItem(key(userId), JSON.stringify(map));
}
