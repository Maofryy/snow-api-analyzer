// Environment detection and configuration for ServiceNow deployment

export type Environment = "development" | "production";

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

    // Check if we're running in Vite dev mode
    if (import.meta.env.DEV) {
        cachedEnvironment = "development";
        return cachedEnvironment;
    }

    // Check if we're running inside ServiceNow (look for ServiceNow-specific globals)
    if (typeof window !== "undefined") {
        // ServiceNow has specific global variables like g_ck, NOW, etc.
        const hasServiceNowGlobals =
            // @ts-expect-error - ServiceNow globals
            window.g_ck !== undefined ||
            // @ts-expect-error - ServiceNow globals
            window.NOW !== undefined ||
            // @ts-expect-error - ServiceNow globals
            window.g_user !== undefined;

        if (hasServiceNowGlobals) {
            cachedEnvironment = "production";
            return cachedEnvironment;
        }

        // Check if we're running on a ServiceNow domain
        const hostname = window.location.hostname;
        const isServiceNowDomain = hostname.includes("service-now.com") || hostname.includes("servicenow.com") || hostname.includes(".service-now.com") || hostname.includes(".servicenow.com");

        if (isServiceNowDomain) {
            cachedEnvironment = "production";
            return cachedEnvironment;
        }
    }

    // Check environment variables
    const envMode = import.meta.env.VITE_ENV_MODE as Environment;

    if (envMode === "production" || envMode === "development") {
        cachedEnvironment = envMode;
        return cachedEnvironment;
    }

    // Default to development for safety
    cachedEnvironment = "development";
    return cachedEnvironment;
}

// Get environment configuration
export function getEnvironmentConfig(): EnvironmentConfig {
    const mode = detectEnvironment();
    const isProduction = mode === "production";
    const isDevelopment = mode === "development";

    return {
        mode,
        isProduction,
        isDevelopment,
        baseUrl: isProduction ? "" : import.meta.env.VITE_INSTANCE_URL || "http://localhost:8080", // Use env var or fallback
        useSessionAuth: isProduction,
        tokenEndpoint: "/api/x_elosa_api_benc_0/app/get-token",
    };
}

// Convenience functions
export const isProduction = () => detectEnvironment() === "production";
export const isDevelopment = () => detectEnvironment() === "development";
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
    },
};

// Get the current environment info for debugging
export function getEnvironmentInfo() {
    const config = getEnvironmentConfig();
    return {
        ...config,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "N/A",
        hostname: typeof window !== "undefined" ? window.location.hostname : "N/A",
        href: typeof window !== "undefined" ? window.location.href : "N/A",
        // @ts-expect-error - ServiceNow globals
        hasServiceNowGlobals: typeof window !== "undefined" && (window.g_ck !== undefined || window.NOW !== undefined),
    };
}
