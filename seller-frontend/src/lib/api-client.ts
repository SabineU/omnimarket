// seller-frontend/src/lib/api-client.ts
// Axios instance pre-configured with base URL, credentials, and
// automatic access-token injection via an interceptor.
import axios from 'axios';
import { getAccessToken, setTokens, clearTokens } from './token-helper';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { apiClient, setTokens, clearTokens, getAccessToken };
