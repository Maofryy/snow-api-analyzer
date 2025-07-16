// Environment detection and configuration for ServiceNow deployment

export type Environment = 'development' | 'production';

export interface EnvironmentConfig {
  mode: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  baseUrl: string;
  useSessionAuth: boolean;
  tokenEndpoint: string;
}

// Cache the environment detection result to prevent multiple calls
let cachedEnvironment: Environment | null = null;

// Detect environment based on various factors
export function detectEnvironment(): Environment {
  // Return cached result if already determined
  if (cachedEnvironment !== null) {
    return cachedEnvironment;
  }

  console.log('Detecting environment (first time)...');
  
  // Check if we're running in Vite dev mode
  if (import.meta.env.DEV) {
    console.log('Environment: development (Vite dev mode)');
    cachedEnvironment = 'development';
    return cachedEnvironment;
  }

  // Check if we're running inside ServiceNow (look for ServiceNow-specific globals)
  if (typeof window !== 'undefined') {
    // ServiceNow has specific global variables like g_ck, NOW, etc.
    const hasServiceNowGlobals = 
      // @ts-ignore - ServiceNow globals
      window.g_ck !== undefined || 
      // @ts-ignore - ServiceNow globals
      window.NOW !== undefined ||
      // @ts-ignore - ServiceNow globals
      window.g_user !== undefined;

    console.log('ServiceNow globals check:', {
      // @ts-ignore
      g_ck: typeof window.g_ck !== 'undefined',
      // @ts-ignore
      NOW: typeof window.NOW !== 'undefined',
      // @ts-ignore
      g_user: typeof window.g_user !== 'undefined',
      hasServiceNowGlobals
    });

    if (hasServiceNowGlobals) {
      console.log('Environment: production (ServiceNow globals detected)');
      cachedEnvironment = 'production';
      return cachedEnvironment;
    }

    // Check if we're running on a ServiceNow domain
    const hostname = window.location.hostname;
    const isServiceNowDomain = 
      hostname.includes('service-now.com') ||
      hostname.includes('servicenow.com') ||
      hostname.includes('.service-now.com') ||
      hostname.includes('.servicenow.com');

    console.log('Domain check:', {
      hostname,
      isServiceNowDomain
    });

    if (isServiceNowDomain) {
      console.log('Environment: production (ServiceNow domain detected)');
      cachedEnvironment = 'production';
      return cachedEnvironment;
    }
  }

  // Check environment variables
  const envMode = import.meta.env.VITE_ENV_MODE as Environment;
  console.log('Environment variable check:', {
    VITE_ENV_MODE: envMode
  });
  
  if (envMode === 'production' || envMode === 'development') {
    console.log(`Environment: ${envMode} (from environment variable)`);
    cachedEnvironment = envMode;
    return cachedEnvironment;
  }

  // Default to development for safety
  console.log('Environment: development (default fallback)');
  cachedEnvironment = 'development';
  return cachedEnvironment;
}

// Get environment configuration
export function getEnvironmentConfig(): EnvironmentConfig {
  const mode = detectEnvironment();
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    mode,
    isProduction,
    isDevelopment,
    baseUrl: isProduction ? '' : (import.meta.env.VITE_INSTANCE_URL || 'http://localhost:8080'), // Use env var or fallback
    useSessionAuth: isProduction,
    tokenEndpoint: '/api/elosa/api_benchmark/get-token'
  };
}

// Convenience functions
export const isProduction = () => detectEnvironment() === 'production';
export const isDevelopment = () => detectEnvironment() === 'development';
export const useSessionAuth = () => isProduction();

// Environment-specific console logging
export const envLog = {
  info: (message: string, ...args: any[]) => {
    if (isDevelopment()) {
      console.log(`[DEV] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment()) {
      console.warn(`[DEV] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[${detectEnvironment().toUpperCase()}] ${message}`, ...args);
  }
};

// Get the current environment info for debugging
export function getEnvironmentInfo() {
  const config = getEnvironmentConfig();
  return {
    ...config,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    href: typeof window !== 'undefined' ? window.location.href : 'N/A',
    // @ts-ignore - ServiceNow globals
    hasServiceNowGlobals: typeof window !== 'undefined' && (window.g_ck !== undefined || window.NOW !== undefined)
  };
}