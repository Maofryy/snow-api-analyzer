# ServiceNow React App Setup Protocol

> **Step-by-step guide to bootstrap a ServiceNow-integrated React application**

This document provides a complete setup protocol for creating React applications that integrate with ServiceNow, following the specifications outlined in the [ServiceNow React App Specifications](./ServiceNow%20React%20App%20Specifications.md).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup Steps](#project-setup-steps)
- [Configuration Files](#configuration-files)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)

---

## 📋 Prerequisites

### System Requirements
- **Node.js** 18+ and npm/yarn/pnpm
- **Git** for version control
- **ServiceNow developer instance** (for testing)
- **Modern code editor** with TypeScript support (VS Code recommended)

### ServiceNow Requirements
- Access to a ServiceNow instance (development/sandbox)
- User account with appropriate table access permissions
- Basic understanding of ServiceNow REST/GraphQL APIs

---

## 🚀 Project Setup Steps

### Step 1: Initialize Project
```bash
# Create new Vite React TypeScript project
npm create vite@latest servicenow-react-app -- --template react-ts

# Navigate to project directory
cd servicenow-react-app

# Install base dependencies
npm install
```

### Step 2: Install ServiceNow-Specific Dependencies
```bash
# Core ServiceNow integration dependencies
npm install @tanstack/react-query zod

# Build and deployment tools
npm install vite-plugin-singlefile terser

# Required Vite plugin (replaces default React plugin)
npm install @vitejs/plugin-react-swc

# Development dependencies
npm install -D @types/node
```

### Step 3: Install UI Framework (shadcn/ui) - Modern Vite Approach
```bash
# Modern Tailwind CSS setup for Vite (eliminates PostCSS issues)
npm install tailwindcss@latest @tailwindcss/vite

# Core UI dependencies
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Radix UI components (essential set)
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
npm install @radix-ui/react-alert-dialog @radix-ui/react-accordion
npm install @radix-ui/react-dropdown-menu @radix-ui/react-popover
npm install @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-progress

# Additional UI utilities
npm install sonner react-hook-form @hookform/resolvers
npm install date-fns react-day-picker

# Initialize basic Tailwind config (required for shadcn/ui)
npx tailwindcss init
```

### Step 4: Create Project Structure
```bash
# Create main source directories
mkdir -p src/{components,contexts,hooks,services,types,utils,pages}

# Create component subdirectories
mkdir -p src/components/{ui,TestConfiguration,ExecutionArea,Header,Scoreboard}

# Create additional directories
mkdir -p docs public/assets

# Create environment files
touch .env.development .env.production .env.local
```

### Step 5: Setup Configuration Files
```bash
# Create Vite configuration
cat > vite.config.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteSingleFile } from "vite-plugin-singlefile";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    tailwindcss(),
    mode === 'production' && viteSingleFile(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    cssCodeSplit: false,
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: mode === 'production'
      }
    },
    sourcemap: mode === 'development'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode)
  }
}));
EOF

# Create shadcn/ui configuration
cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF

# Update Tailwind configuration
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
EOF

# No PostCSS configuration needed - using Vite plugin approach!
```

### Step 6: Setup Environment Configuration
```bash
# Development environment
cat > .env.development << 'EOF'
VITE_ENV_MODE=development
VITE_INSTANCE_URL=https://your-dev-instance.service-now.com
EOF

# Production environment
cat > .env.production << 'EOF'
VITE_ENV_MODE=production
EOF

# Local override (add to .gitignore)
cat > .env.local << 'EOF'
# Local development overrides
# VITE_INSTANCE_URL=https://your-personal-dev-instance.service-now.com
EOF

# Update .gitignore
cat >> .gitignore << 'EOF'

# Environment files
.env.local
.env.*.local

# ServiceNow specific
*.update-set
*.xml
EOF
```

### Step 6.5: Setup Tailwind CSS Import (Modern Vite Approach)
```bash
# Update src/index.css with modern Tailwind import (eliminates PostCSS issues)
cat > src/index.css << 'EOF'
@import "tailwindcss";
EOF

# Update TypeScript configuration for path mapping
# Update tsconfig.app.json
cat >> tsconfig.app.json << 'EOF'
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
EOF

# Update main tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
EOF
```

### Step 7: Create Core Utilities
```bash
# Environment detection utility
cat > src/utils/environment.ts << 'EOF'
export type Environment = "development" | "production";

export interface EnvironmentConfig {
    mode: Environment;
    isProduction: boolean;
    isDevelopment: boolean;
    baseUrl: string;
    useSessionAuth: boolean;
    tokenEndpoint: string;
}

let cachedEnvironment: Environment | null = null;

export function detectEnvironment(): Environment {
    if (cachedEnvironment !== null) {
        return cachedEnvironment;
    }

    if (import.meta.env.DEV) {
        cachedEnvironment = "development";
        return cachedEnvironment;
    }

    if (typeof window !== "undefined") {
        // @ts-expect-error - ServiceNow globals
        const hasServiceNowGlobals =
            window.g_ck !== undefined ||
            // @ts-expect-error - ServiceNow globals  
            window.NOW !== undefined ||
            // @ts-expect-error - ServiceNow globals
            window.g_user !== undefined;

        if (hasServiceNowGlobals) {
            cachedEnvironment = "production";
            return cachedEnvironment;
        }

        const hostname = window.location.hostname;
        const isServiceNowDomain = hostname.includes("service-now.com") || 
                                 hostname.includes("servicenow.com");

        if (isServiceNowDomain) {
            cachedEnvironment = "production";
            return cachedEnvironment;
        }
    }

    const envMode = import.meta.env.VITE_ENV_MODE as Environment;
    if (envMode === "production" || envMode === "development") {
        cachedEnvironment = envMode;
        return cachedEnvironment;
    }

    cachedEnvironment = "development";
    return cachedEnvironment;
}

export function getEnvironmentConfig(): EnvironmentConfig {
    const mode = detectEnvironment();
    const isProduction = mode === "production";
    const isDevelopment = mode === "development";

    return {
        mode,
        isProduction,
        isDevelopment,
        baseUrl: isProduction ? "" : import.meta.env.VITE_INSTANCE_URL || "http://localhost:8080",
        useSessionAuth: isProduction,
        tokenEndpoint: "/api/x_[your_scope]_[your_app]/app/get-token", // Update with your scope
    };
}

export const isProduction = () => detectEnvironment() === "production";
export const isDevelopment = () => detectEnvironment() === "development";
EOF

# Create utility library
mkdir -p src/lib
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF
```

### Step 8: Setup TypeScript Definitions
```bash
# ServiceNow types
cat > src/types/servicenow.ts << 'EOF'
export interface ServiceNowInstance {
  url: string;
  username: string;
  password: string;
  token: string;
  connected: boolean;
  sessionToken?: string;
  sessionExpiry?: Date;
  authMode?: 'basic' | 'session';
  lastTokenRefresh?: Date;
}

export interface ApiCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  responseTime: number;
  payloadSize: number;
  allResponseTimes: number[];
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
}
EOF

# Main types index
cat > src/types/index.ts << 'EOF'
export * from './servicenow';

export interface TestConfiguration {
  dotWalkingTests: {
    enabled: boolean;
    parameters: {
      table: string;
      recordLimit: number;
    };
  };
  multiTableTests: {
    enabled: boolean;
    parameters: {
      recordLimit: number;
    };
  };
  performanceTests: {
    enabled: boolean;
    parameters: {
      recordLimit: number;
    };
  };
}

export interface TestResult {
  id: string;
  testType: string;
  restApi: {
    responseTime: number;
    payloadSize: number;
    success: boolean;
    error?: string;
  };
  graphqlApi: {
    responseTime: number;
    payloadSize: number;
    success: boolean;
    error?: string;
  };
  winner: 'rest' | 'graphql' | 'tie';
  timestamp: Date;
}
EOF
```

### Step 9: Create Core Services
```bash
# Authentication service
cat > src/services/authService.ts << 'EOF'
import { getEnvironmentConfig } from '../utils/environment';
import { ServiceNowInstance, ApiError } from '../types';

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

class AuthService {
  private config = getEnvironmentConfig();

  async getAuthConfig(instance?: ServiceNowInstance): Promise<AuthConfig> {
    const headers: AuthHeaders = {
      'Content-Type': 'application/json'
    };

    let baseUrl = this.config.baseUrl;

    if (this.config.useSessionAuth) {
      // Production mode - session token
      try {
        const token = await this.getSessionToken();
        headers['X-UserToken'] = token;
        headers['X-Requested-With'] = 'XMLHttpRequest';
        baseUrl = '';
      } catch (error) {
        throw new Error('Failed to retrieve session token');
      }
    } else {
      // Development mode - basic auth
      if (!instance?.username || !instance?.password) {
        throw new Error('Username and password required for development mode');
      }

      const basicAuth = btoa(`${instance.username}:${instance.password}`);
      headers['Authorization'] = `Basic ${basicAuth}`;
      baseUrl = instance.url || this.config.baseUrl;
    }

    return {
      headers,
      baseUrl,
      isSessionAuth: this.config.useSessionAuth
    };
  }

  private async getSessionToken(): Promise<string> {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`Token fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result?.token || data.token;
  }

  async testConnection(instance?: ServiceNowInstance): Promise<boolean> {
    try {
      const authConfig = await this.getAuthConfig(instance);
      const testUrl = `${authConfig.baseUrl}/api/now/table/sys_user?sysparm_limit=1`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: authConfig.headers,
        credentials: authConfig.isSessionAuth ? 'include' : 'same-origin'
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
EOF

# API service stub
cat > src/services/apiService.ts << 'EOF'
import { authService } from './authService';
import { ServiceNowInstance, ApiCallResult } from '../types';

export interface BenchmarkTestParams {
  table: string;
  fields?: string[];
  limit?: number;
  filter?: string;
}

class ApiService {
  async makeRestCall<T>(params: BenchmarkTestParams, instance?: ServiceNowInstance): Promise<ApiCallResult<T>> {
    const startTime = performance.now();
    
    try {
      const authConfig = await authService.getAuthConfig(instance);
      const url = `${authConfig.baseUrl}/api/now/table/${params.table}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: authConfig.headers,
        credentials: authConfig.isSessionAuth ? 'include' : 'same-origin'
      });

      const endTime = performance.now();
      const data = await response.json();
      
      return {
        success: response.ok,
        data,
        responseTime: endTime - startTime,
        payloadSize: JSON.stringify(data).length,
        allResponseTimes: [endTime - startTime]
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'REQUEST_ERROR',
          timestamp: new Date()
        },
        responseTime: endTime - startTime,
        payloadSize: 0,
        allResponseTimes: [endTime - startTime]
      };
    }
  }

  async makeGraphQLCall<T>(params: BenchmarkTestParams, instance?: ServiceNowInstance): Promise<ApiCallResult<T>> {
    // Implementation similar to REST call but for GraphQL endpoint
    // This is a stub - implement based on your GraphQL requirements
    return this.makeRestCall(params, instance);
  }
}

export const apiService = new ApiService();
EOF
```

### Step 10: Setup Basic Components
```bash
# Initialize shadcn/ui (will work properly now that Tailwind is configured)
npx shadcn@latest init

# Install basic components
npx shadcn@latest add button card dialog tabs alert

# Create basic layout component
cat > src/components/Layout.tsx << 'EOF'
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background font-mono">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">ServiceNow API Benchmark</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
EOF

# Create basic App component
cat > src/App.tsx << 'EOF'
import React from 'react';
import { Layout } from './components/Layout';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';

function App() {
  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ServiceNow Integration</CardTitle>
            <CardDescription>
              Connect to your ServiceNow instance to begin benchmarking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Connect to ServiceNow</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default App;
EOF
```

### Step 11: Update Package.json Scripts
```bash
# Add custom scripts to package.json
npm pkg set scripts.build:dev="vite build --mode development"
npm pkg set scripts.build:prod="vite build --mode production"
npm pkg set scripts.preview:prod="npm run build:prod && vite preview"
npm pkg set scripts.type-check="tsc --noEmit"
npm pkg set scripts.lint:fix="eslint . --ext ts,tsx --fix"
```

### Step 12: Initialize Development Environment
```bash
# Type check the project
npm run type-check

# Start development server
npm run dev

# In another terminal, test builds
npm run build:dev
npm run build:prod
```

---

## 📁 Project Structure

After completing the setup, your project structure should look like this:

```
servicenow-react-app/
├── docs/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── ExecutionArea/   # Test execution components
│   │   ├── Header/          # Header components
│   │   └── Layout.tsx       # Main layout
│   ├── contexts/            # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/
│   │   └── utils.ts        # Utility functions
│   ├── pages/              # Page components
│   ├── services/
│   │   ├── authService.ts  # Authentication
│   │   └── apiService.ts   # API calls
│   ├── types/
│   │   ├── index.ts        # Type exports
│   │   └── servicenow.ts   # ServiceNow types
│   ├── utils/
│   │   └── environment.ts  # Environment detection
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.development
├── .env.production
├── .env.local
├── components.json
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 🔧 Development Workflow

### Daily Development
```bash
# Start development server
npm run dev

# Type checking (in another terminal)
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

### Testing Builds
```bash
# Test development build
npm run build:dev

# Test production build (for ServiceNow deployment)
npm run build:prod

# Preview production build
npm run preview:prod
```

### Adding New Components
```bash
# Add shadcn/ui components as needed
npx shadcn@latest add select
npx shadcn@latest add form
npx shadcn@latest add table

# Create custom components in appropriate directories
mkdir src/components/NewFeature
```

---

## 🚚 Deployment Guide

### Development Deployment
1. Configure your development ServiceNow instance URL in `.env.development`
2. Build with `npm run build:dev` 
3. Deploy the generated `dist/index.html` to your development environment

### Production Deployment
1. Update the token endpoint in `src/utils/environment.ts`
2. Build with `npm run build:prod`
3. Deploy the single-file `dist/index.html` to ServiceNow:
   - Upload to ServiceNow as a UI Page or Widget
   - Ensure proper scoped application setup
   - Configure authentication endpoints

### ServiceNow-Specific Deployment
```bash
# Generate production build
npm run build:prod

# The dist/index.html file contains everything needed
# Upload this file to ServiceNow as:
# - UI Page (for full-page application)
# - Widget (for Service Portal integration)
# - HTML content in a custom application
```

---

## 🔍 Troubleshooting

### Common Issues

**PostCSS/Tailwind CSS Build Errors (SOLVED):**
The updated protocol eliminates PostCSS errors by using the modern `@tailwindcss/vite` plugin approach instead of PostCSS configuration. If you still encounter issues:

```bash
# Ensure you're using the correct versions
npm install tailwindcss@latest @tailwindcss/vite

# Verify your src/index.css uses the correct import
echo '@import "tailwindcss";' > src/index.css

# Check that vite.config.ts includes the Tailwind plugin
# plugins: [react(), tailwindcss(), ...]
```

**Build Failures:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

**TypeScript Errors:**
```bash
# Check TypeScript configuration
npm run type-check

# Update type definitions
npm install -D @types/node
```

**Authentication Issues:**
- Verify ServiceNow instance URL format
- Check user permissions on target tables
- Ensure proper CORS configuration in ServiceNow
- Validate token endpoint path matches your scoped application

**Build Size Issues:**
- Review bundle analyzer output
- Consider code splitting for development builds
- Optimize asset imports and dependencies

### Environment Variables
```bash
# Debug environment detection
console.log('Environment:', import.meta.env.VITE_ENV_MODE);
console.log('Instance URL:', import.meta.env.VITE_INSTANCE_URL);
```

### ServiceNow Connection Testing
```bash
# Test your setup with curl
curl -u "username:password" \
  "https://your-instance.service-now.com/api/now/table/sys_user?sysparm_limit=1"
```

---

## 📚 Next Steps

After completing the setup:

1. **Configure your ServiceNow instance** details in the environment files
2. **Implement authentication flow** based on your ServiceNow setup
3. **Add specific ServiceNow table integrations** you need
4. **Customize the UI components** for your use case
5. **Set up testing framework** for your components
6. **Configure CI/CD pipeline** for automated builds

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Compatibility:** ServiceNow Tokyo+, React 18+, Vite 5+