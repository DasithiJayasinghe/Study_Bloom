import { getApiBaseUrl } from '@/utils/apiBaseUrl';

/**
 * Default request timeout (ms). Override with EXPO_PUBLIC_API_TIMEOUT_MS in `.env`.
 * If the phone cannot reach the PC IP, requests fail — see getTimeoutHint().
 */
export function getApiTimeoutMs(): number {
  const raw = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;
  if (raw == null || raw === '') return 30000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 5000 ? n : 30000;
}

export function getTimeoutHint(): string {
  return `Using API base: ${getApiBaseUrl()}. On a real device use your PC's LAN IP (not localhost). Allow Node/port 5000 in Windows Firewall, same Wi‑Fi as the phone, or run Expo with --tunnel.`;
}

/**
 * Fetch with AbortController timeout. Prefer this over raw `fetch` for API calls.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = getApiTimeoutMs()
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const err = error as { name?: string; message?: string };
    if (err.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${timeoutMs}ms. ${getTimeoutHint()}`
      );
    }
    if (err.message?.includes('Network request failed')) {
      throw new Error(
        `Cannot reach ${getApiBaseUrl()}. ${getTimeoutHint()}`
      );
    }
    throw error;
  }
}
