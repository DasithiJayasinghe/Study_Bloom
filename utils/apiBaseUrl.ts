/**
 * Single source of truth for `EXPO_PUBLIC_API_URL`.
 * Ensures the base ends with `/api` exactly once (e.g. `http://host:5000/api`).
 */
export function getApiBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').trim();
  const noTrailing = raw.replace(/\/+$/, '');
  if (noTrailing.endsWith('/api')) return noTrailing;
  return `${noTrailing}/api`;
}
