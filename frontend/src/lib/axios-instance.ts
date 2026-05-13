// frontend/src/lib/axios-instance.ts
// Axios instance configured with automatic Authorization header and token refresh.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { config } from '../config';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './token-helper';

// ---------------------------------------------------------------------------
// Create the Axios instance with the API base URL and JSON headers.
// ---------------------------------------------------------------------------
const axiosInstance = axios.create({
  baseURL: config.API_BASE_URL, // e.g., http://localhost:5000/api
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor – attach the access token (if present)
// ---------------------------------------------------------------------------
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor – handle 401 errors by trying a token refresh
// ---------------------------------------------------------------------------
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: Error) => void }[] = [];

// Helper that resolves or rejects all queued requests after a refresh attempt.
function processQueue(error: Error | null, token: string | null): void {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only try to refresh if the error is a 401 and we haven't already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      // No refresh token – can't refresh, force login
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      // Call the refresh endpoint
      const { data } = await axios.post(`${config.API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const newAccessToken = data.data.tokens.accessToken;
      const newRefreshToken = data.data.tokens.refreshToken;

      setTokens(newAccessToken, newRefreshToken);

      // Retry all queued requests with the new token
      processQueue(null, newAccessToken);

      // Retry the original request with the new token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Refresh failed – clear tokens and redirect to login
      processQueue(refreshError as Error, null);
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
