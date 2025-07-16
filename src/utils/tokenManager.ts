// ServiceNow session token management for production environment

import { getEnvironmentConfig, envLog } from './environment';

export interface TokenResponse {
  result?: {
    token: string;
    expires?: string;
  };
  token?: string; // Direct token for backward compatibility
  expires?: string;
  error?: string;
}

export interface TokenInfo {
  token: string;
  fetchedAt: number;
  expiresAt?: number;
}

class TokenManager {
  private cachedToken: TokenInfo | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;
  private readonly TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly TOKEN_REFRESH_THRESHOLD = 30 * 1000; // 30 seconds before expiry

  constructor() {
    envLog.info('TokenManager initialized');
  }

  // Get a valid token, fetching if necessary
  async getToken(): Promise<string> {
    envLog.info('Getting token...');

    // Check if we have a valid cached token
    if (this.isTokenValid()) {
      envLog.info('Using cached token');
      return this.cachedToken!.token;
    }

    // If there's already a refresh in progress, wait for it
    if (this.tokenRefreshPromise) {
      envLog.info('Waiting for existing token refresh...');
      return this.tokenRefreshPromise;
    }

    // Start a new token fetch
    this.tokenRefreshPromise = this.fetchTokenFromEndpoint();

    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  // Check if current token is valid and not expired
  private isTokenValid(): boolean {
    if (!this.cachedToken) {
      return false;
    }

    const now = Date.now();
    const tokenAge = now - this.cachedToken.fetchedAt;

    // Check if token is too old
    if (tokenAge > this.TOKEN_CACHE_DURATION) {
      envLog.info('Token expired due to age');
      return false;
    }

    // Check if token has explicit expiry
    if (this.cachedToken.expiresAt && now > (this.cachedToken.expiresAt - this.TOKEN_REFRESH_THRESHOLD)) {
      envLog.info('Token will expire soon');
      return false;
    }

    return true;
  }

  // Fetch token from ServiceNow endpoint
  private async fetchTokenFromEndpoint(): Promise<string> {
    const config = getEnvironmentConfig();
    const tokenUrl = config.tokenEndpoint;

    envLog.info(`Fetching token from: ${tokenUrl}`);

    try {
      const response = await fetch(tokenUrl, {
        method: 'GET',
        credentials: 'include', // Important for ServiceNow session cookies
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // Often required by ServiceNow
        }
      });

      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.status} ${response.statusText}`);
      }

      const tokenData: TokenResponse = await response.json();
      envLog.info('Token response received:', tokenData);

      if (tokenData.error) {
        throw new Error(`Token endpoint error: ${tokenData.error}`);
      }

      // Extract token from nested or direct response structure
      const token = tokenData.result?.token || tokenData.token;
      const expires = tokenData.result?.expires || tokenData.expires;

      if (!token) {
        throw new Error('No token received from endpoint');
      }

      // Cache the token
      this.cachedToken = {
        token: token,
        fetchedAt: Date.now(),
        expiresAt: expires ? new Date(expires).getTime() : undefined
      };

      envLog.info('Token fetched and cached successfully');
      return token;

    } catch (error) {
      envLog.error('Failed to fetch token:', error);
      throw error;
    }
  }

  // Force refresh the token
  async refreshToken(): Promise<string> {
    envLog.info('Force refreshing token...');
    this.clearCachedToken();
    return this.getToken();
  }

  // Clear cached token
  clearCachedToken(): void {
    this.cachedToken = null;
    this.tokenRefreshPromise = null;
    envLog.info('Token cache cleared');
  }

  // Get token info for debugging
  getTokenInfo(): TokenInfo | null {
    return this.cachedToken;
  }

  // Check if token manager is ready
  isReady(): boolean {
    const config = getEnvironmentConfig();
    return config.useSessionAuth;
  }
}

// Singleton instance
const tokenManager = new TokenManager();

// Export the singleton instance and key methods
export { tokenManager };

// Convenience functions
export const getSessionToken = () => tokenManager.getToken();
export const refreshSessionToken = () => tokenManager.refreshToken();
export const clearSessionToken = () => tokenManager.clearCachedToken();
export const getTokenInfo = () => tokenManager.getTokenInfo();
export const isTokenManagerReady = () => tokenManager.isReady();

// Test token endpoint connectivity
export async function testTokenEndpoint(): Promise<boolean> {
  try {
    await tokenManager.getToken();
    return true;
  } catch (error) {
    envLog.error('Token endpoint test failed:', error);
    return false;
  }
}