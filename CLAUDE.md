# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a ServiceNow API Benchmark Tool that compares REST API vs GraphQL API performance. It's a React application built with Vite, TypeScript, and shadcn/ui components that allows users to configure and run various types of API tests against ServiceNow instances in both development and production environments.

## Common Commands

```bash
# Install dependencies
npm i

# Start development server
npm run dev

# Build for production (ServiceNow deployment)
npm run build

# Build for development (with source maps)
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm preview
```

## Critical Architecture Concepts

### Dual-Mode Authentication System

The application uses a sophisticated authentication system that automatically adapts to deployment environment:

#### Development Mode
- **Environment Variables**: Uses `VITE_INSTANCE_URL`, `VITE_APP_USER`, `VITE_APP_PASSWORD` from `.env`
- **Basic Authentication**: HTTP Basic Auth headers for external ServiceNow instance access
- **Environment Detection**: Triggered by `import.meta.env.DEV` or absence of ServiceNow globals

#### Production Mode (ServiceNow-hosted)
- **Session Authentication**: Uses ServiceNow session tokens via `X-UserToken` header
- **Token Management**: `tokenManager.ts` handles token caching, expiration, and refresh
- **Environment Detection**: Detects ServiceNow globals (`window.g_ck`, `window.NOW`, `window.g_user`) or ServiceNow domains

#### Key Authentication Files
- `src/services/authService.ts`: Central authentication service with dual-mode support
- `src/utils/tokenManager.ts`: Production session token management
- `src/utils/environment.ts`: Environment detection with caching
- `src/utils/secureStorage.ts`: Development credential storage

### ServiceNow API Response Handling

**Critical**: ServiceNow APIs return nested response structures that must be properly mapped:

```typescript
// Token responses
{ "result": { "token": "..." } }

// Instance-info responses  
{ "result": { "url": "...", "username": "..." } }
```

Both `fetchInstanceInfo()` and `tokenManager` handle this nested structure with fallback support.

### State Management Architecture

- **BenchmarkContext** (`src/contexts/BenchmarkContext.tsx`): Central state using React's useReducer
- **Actions**: `SET_INSTANCE`, `UPDATE_TEST_CONFIG`, `ADD_TEST_RESULT`, `UPDATE_METRICS`
- **Secure Storage Integration**: Automatic credential persistence in development mode

### Test Execution System

#### Test Specifications (`src/specs/testSpecs.ts`)
Defines comprehensive test categories:
- **Dot-Walking Tests**: Relationship traversal performance (single → multi-level → complex)
- **Multi-Table Tests**: Service desk dashboard scenarios (4 tables in 1 GraphQL vs 4 REST calls)
- **Schema Tailoring**: Mobile-optimized minimal data fetching
- **Performance Scale**: High-volume tests (500-5000 records)
- **Real-World Scenarios**: Complete incident detail page loads

#### API Building (`src/utils/apiBuilders.ts`)
- `buildRestUrl()`: ServiceNow REST Table API endpoint construction
- `buildGraphQLQuery()`: ServiceNow GlideRecord_Query schema generation
- Field mapping and relationship handling for both API types

#### Data Comparison (`src/utils/dataComparison.ts`)
- Validates data consistency between REST and GraphQL responses
- Handles field variations, formatting differences, and nested object comparison
- Generates comparison scores and detailed mismatch reports

### Component Architecture

#### Core Layout Structure
- `Header/InstanceStatus.tsx`: Real-time connection status, token info, auth mode display
- `TestConfiguration/`: Dynamic test category panels with variant selection
- `ExecutionArea/`: Live progress tracking, API call details modal, results console
- `Scoreboard/`: Performance metrics, winner statistics, live scoring

#### Execution Flow
1. **Environment Detection** → Authentication mode selection
2. **Instance Configuration** → Token fetch (production) or credential validation (development)
3. **Test Selection** → Category, variant, and limit configuration
4. **Parallel Execution** → REST and GraphQL calls with randomized order
5. **Data Comparison** → Consistency validation and scoring
6. **Results Display** → Real-time metrics and detailed analysis

### Build Configuration

#### Vite Configuration (`vite.config.ts`)
- **Production Build**: Single-file output with `vite-plugin-singlefile` for ServiceNow deployment
- **Development Build**: Source maps enabled, console logs preserved
- **Environment Handling**: Proper `import.meta.env` setup for dual-mode operation

#### Environment Variables
Development mode requires:
```bash
VITE_INSTANCE_URL="https://instance.service-now.com/"
VITE_APP_USER="username"
VITE_APP_PASSWORD="password"
```

## Development Guidelines

### Authentication Development
- Test both development and production authentication flows
- Verify token response mapping for nested ServiceNow API responses
- Ensure environment detection works correctly across deployment scenarios

### API Integration
- All ServiceNow API calls must handle nested `{result: {...}}` response structure
- Use `authService.makeAuthenticatedRequest()` for consistent authentication
- Include proper ServiceNow headers: `X-Requested-With: XMLHttpRequest`, `credentials: 'include'`

### Error Handling
- Authentication errors should provide clear development vs production context
- Connection failures must distinguish between network, auth, and ServiceNow instance issues
- Test execution errors should preserve both REST and GraphQL failure details

### Performance Considerations
- Environment detection is cached to prevent multiple calls
- Token management includes automatic refresh and expiration handling
- API calls use request queuing with rate limiting to prevent ServiceNow throttling