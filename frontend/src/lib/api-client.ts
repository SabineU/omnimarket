// frontend/src/lib/api-client.ts
// Thin wrapper around fetch that prepends the API base URL and handles JSON.
import { config } from '../config';

/**
 * Wrapper around fetch that automatically sets JSON headers and prepends the
 * API base URL.  When an auth token is available, it attaches it.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.API_BASE_URL}${endpoint}`;

  // Merge default headers with any custom ones
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // If we have an auth token stored, attach it.
  // For now the token is stored nowhere; later we'll read from localStorage or a cookie.
  // This line is a placeholder that we'll activate in Phase 12.8.
  // const token = localStorage.getItem('accessToken');
  // if (token) {
  //   (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  // }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle errors gracefully
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
