// Authentication service supporting both development (basic auth) and production (session token) modes

import { getEnvironmentConfig, envLog } from '../utils/environment';
import { getSessionToken, refreshSessionToken } from '../utils/tokenManager';
import { ServiceNowInstance } from '../types';

export interface AuthHeaders {
  'Content-Type': string;
  'Authorization'?: string;
  'X-UserToken'?: string;
  'X-Requested-With'?: string;
}

export interface AuthConfig {
  headers: AuthHeaders;
  baseUrl: string;
  isSessionAuth: boolean;
}

export interface AuthError {
  code: 'TOKEN_EXPIRED' | 'TOKEN_FETCH_FAILED' | 'AUTH_FAILED' | 'NETWORK_ERROR';
  message: string;
  originalError?: Error;
}

class AuthService {
  private config = getEnvironmentConfig();

  constructor() {
    envLog.info(`AuthService initialized for ${this.config.mode} mode`);
  }

  // Get authentication configuration for API calls
  async getAuthConfig(instance?: ServiceNowInstance): Promise<AuthConfig> {
    const headers: AuthHeaders = {
      'Content-Type': 'application/json'
    };

    let baseUrl = this.config.baseUrl;

    if (this.config.useSessionAuth) {
      // Production mode - use session token
      try {
        const token = await getSessionToken();
        headers['X-UserToken'] = token;
        headers['X-Requested-With'] = 'XMLHttpRequest';
        baseUrl = ''; // Use relative URLs in production
        
        envLog.info('Using session token authentication');
      } catch (error) {
        envLog.error('Failed to get session token:', error);
        throw this.createAuthError('TOKEN_FETCH_FAILED', 'Failed to retrieve session token', error as Error);
      }
    } else {
      // Development mode - use basic auth
      if (!instance || !instance.username || !instance.password) {
        throw this.createAuthError('AUTH_FAILED', 'Username and password required for development mode');
      }

      const basicAuth = btoa(`${instance.username}:${instance.password}`);
      headers['Authorization'] = `Basic ${basicAuth}`;
      baseUrl = instance.url || this.config.baseUrl;
      
      envLog.info('Using basic authentication');
    }

    return {
      headers,
      baseUrl,
      isSessionAuth: this.config.useSessionAuth
    };
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {},
    instance?: ServiceNowInstance,
    retryCount = 0
  ): Promise<Response> {
    const maxRetries = 2;

    try {
      const authConfig = await this.getAuthConfig(instance);
      
      // Construct full URL
      const url = this.buildUrl(authConfig.baseUrl, endpoint);
      
      // Merge auth headers with provided headers
      const headers = {
        ...authConfig.headers,
        ...options.headers
      };

      const requestOptions: RequestInit = {
        ...options,
        headers,
        credentials: authConfig.isSessionAuth ? 'include' : 'same-origin'
      };

      envLog.info(`Making authenticated request to: ${url}`);

      const response = await fetch(url, requestOptions);

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        if (authConfig.isSessionAuth && retryCount < maxRetries) {
          envLog.warn('Authentication failed, refreshing token and retrying...');
          
          // Refresh token and retry
          await refreshSessionToken();
          return this.makeAuthenticatedRequest(endpoint, options, instance, retryCount + 1);
        }

        throw this.createAuthError('AUTH_FAILED', `Authentication failed: ${response.status} ${response.statusText}`);
      }

      return response;

    } catch (error) {
      if (error instanceof Error && error.name === 'TypeError') {
        throw this.createAuthError('NETWORK_ERROR', 'Network error occurred', error);
      }
      throw error;
    }
  }

  // Build full URL from base and endpoint
  private buildUrl(baseUrl: string, endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }

    if (baseUrl === '') {
      // Production mode - use relative URLs
      return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    }

    // Development mode - use full URLs
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  // Create standardized auth error
  private createAuthError(code: AuthError['code'], message: string, originalError?: Error): AuthError {
    return {
      code,
      message,
      originalError
    };
  }

  // Test authentication
  async testAuthentication(instance?: ServiceNowInstance): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest('api/now/table/sys_user', {
        method: 'GET'
      }, instance);

      return response.ok;
    } catch (error) {
      envLog.error('Authentication test failed:', error);
      return false;
    }
  }

  // Get authentication status
  getAuthStatus(): { mode: string; isSessionAuth: boolean; ready: boolean } {
    return {
      mode: this.config.mode,
      isSessionAuth: this.config.useSessionAuth,
      ready: this.config.isDevelopment || this.config.useSessionAuth
    };
  }

  // Check if running in production mode
  isProductionMode(): boolean {
    return this.config.isProduction;
  }

  // Check if running in development mode
  isDevelopmentMode(): boolean {
    return this.config.isDevelopment;
  }
}

// Singleton instance
const authService = new AuthService();

// Export singleton and convenience functions
export { authService };

// Convenience functions
export const getAuthConfig = (instance?: ServiceNowInstance) => authService.getAuthConfig(instance);
export const makeAuthenticatedRequest = (endpoint: string, options?: RequestInit, instance?: ServiceNowInstance) => 
  authService.makeAuthenticatedRequest(endpoint, options, instance);
export const testAuthentication = (instance?: ServiceNowInstance) => authService.testAuthentication(instance);
export const getAuthStatus = () => authService.getAuthStatus();
export const isProductionMode = () => authService.isProductionMode();
export const isDevelopmentMode = () => authService.isDevelopmentMode();

// Helper function to handle auth errors
export function isAuthError(error: unknown): error is AuthError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

// Helper function to get user-friendly auth error message
export function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'TOKEN_EXPIRED':
      return 'Your session has expired. Please refresh the page.';
    case 'TOKEN_FETCH_FAILED':
      return 'Unable to authenticate with ServiceNow. Please check your session.';
    case 'AUTH_FAILED':
      return 'Authentication failed. Please check your credentials.';
    case 'NETWORK_ERROR':
      return 'Network error occurred. Please check your connection.';
    default:
      return 'An authentication error occurred.';
  }
}