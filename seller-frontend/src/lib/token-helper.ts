// seller-frontend/src/lib/token-helper.ts
// Stores and retrieves the access token in localStorage.
const ACCESS_TOKEN_KEY = 'omnimarket_seller_access_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
