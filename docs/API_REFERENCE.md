# 🔧 API Reference - ServiceNow API Benchmark Tool

## Overview

This document provides a comprehensive reference for developers working with the ServiceNow API Benchmark Tool's internal APIs, services, and utilities.

## 🔐 Authentication Services

### AuthService (`src/services/authService.ts`)

Central authentication service supporting dual-mode operation (development/production).

#### Key Methods

```typescript
// Environment detection and configuration
getInstanceInfo(): Promise<InstanceInfo>
isProduction(): boolean
getAuthMode(): 'development' | 'production'

// Authenticated request wrapper
makeAuthenticatedRequest<T>(url: string, options?: RequestOptions): Promise<T>

// Connection management
testConnection(): Promise<boolean>
```

#### Usage Example
```typescript
import { authService } from '@/services/authService';

// Check authentication mode
const mode = authService.getAuthMode();

// Make authenticated API call
const data = await authService.makeAuthenticatedRequest('/api/now/table/incident');
```

### TokenManager (`src/utils/tokenManager.ts`)

Production-mode session token management with automatic refresh and caching.

#### Key Methods
```typescript
// Token acquisition and management
getValidToken(): Promise<string>
clearToken(): void
isTokenValid(): boolean

// Token refresh and expiration handling
refreshToken(): Promise<string>
```

#### Configuration
```typescript
interface TokenConfig {
  cacheDuration: number;    // 45 minutes default
  refreshThreshold: number; // 5 minutes before expiry
  maxRetries: number;      // 3 attempts default
}
```

## 📊 Test Execution Services

### TestExecutionService (`src/services/testExecutionService.ts`)

Core service for executing API benchmarks and managing test lifecycle.

#### Test Execution
```typescript
// Execute individual test scenario
executeTest(config: TestConfig): Promise<TestResult>

// Execute test category with multiple variants
executeTestCategory(category: TestCategory): Promise<CategoryResult[]>

// Execute custom request comparison
executeCustomRequest(request: CustomRequest): Promise<ComparisonResult>
```

#### Test Configuration
```typescript
interface TestConfig {
  category: TestCategory;
  variant: TestVariant;
  table: string;
  recordLimit: number;
  restFields: string[];
  graphqlFields: string[];
  filters?: QueryFilter[];
}
```

### TestSpecsService (`src/services/testSpecsService.ts`)

Service for managing and accessing pre-built test specifications.

#### Specification Management
```typescript
// Retrieve test specifications
getTestSpecs(): TestSpecification[]
getTestSpecsByCategory(category: string): TestSpecification[]
getTestSpecById(id: string): TestSpecification | null

// Execute specification-based tests
executeTestSpec(specId: string, params?: ExecutionParams): Promise<TestResult>
```

## 🛠️ API Builder Utilities

### API Builders (`src/utils/apiBuilders.ts`)

Utilities for constructing ServiceNow REST and GraphQL queries.

#### REST API Builder
```typescript
// Build ServiceNow REST Table API URL
buildRestUrl(config: RestConfig): string

interface RestConfig {
  table: string;
  fields: string[];
  filters?: QueryFilter[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  displayValue?: 'true' | 'false' | 'all';
}
```

#### GraphQL Query Builder
```typescript
// Build ServiceNow GraphQL GlideRecord_Query
buildGraphQLQuery(config: GraphQLConfig): string

interface GraphQLConfig {
  table: string;
  fields: string[];
  filters?: QueryFilter[];
  limit?: number;
  orderBy?: string;
}
```

#### Usage Examples
```typescript
import { buildRestUrl, buildGraphQLQuery } from '@/utils/apiBuilders';

// REST API URL
const restUrl = buildRestUrl({
  table: 'incident',
  fields: ['number', 'short_description', 'caller.name'],
  filters: [{ field: 'state', operator: '=', value: '1' }],
  limit: 100
});

// GraphQL Query
const graphqlQuery = buildGraphQLQuery({
  table: 'incident',
  fields: ['number', 'shortDescription', 'caller { name }'],
  filters: [{ field: 'state', operator: 'EQUALS', value: '1' }],
  limit: 100
});
```

## 📈 Data Analysis Utilities

### Data Comparison (`src/utils/dataComparison.ts`)

Advanced data consistency validation between REST and GraphQL responses.

#### Comparison Methods
```typescript
// Compare full response datasets
compareResponses(restData: any[], graphqlData: any[]): ComparisonResult

// Compare individual records
compareRecords(restRecord: any, graphqlRecord: any): RecordComparison

// Generate comparison score
calculateConsistencyScore(comparison: ComparisonResult): number
```

#### Comparison Result Structure
```typescript
interface ComparisonResult {
  score: number;              // 0-100 consistency percentage
  totalRecords: number;       // Number of records compared
  matchingRecords: number;    // Records with exact matches
  fieldMismatches: FieldMismatch[];
  metadata: {
    restCount: number;
    graphqlCount: number;
    processingTime: number;
  };
}
```

### Scenario Validator (`src/utils/scenarioValidator.ts`)

Input validation and sanitization for test scenarios and custom requests.

#### Validation Methods
```typescript
// Validate test configuration
validateTestConfig(config: TestConfig): ValidationResult

// Validate custom request
validateCustomRequest(request: CustomRequest): ValidationResult

// Sanitize user inputs
sanitizeInput(input: string): string
```

## 🗄️ Storage Utilities

### Secure Storage (`src/utils/secureStorage.ts`)

Encrypted credential storage for development mode.

#### Storage Methods
```typescript
// Store encrypted credentials
storeCredentials(credentials: Credentials): void

// Retrieve and decrypt credentials
getCredentials(): Credentials | null

// Clear stored credentials
clearCredentials(): void
```

### Custom Request Storage (`src/utils/customRequestStorage.ts`)

Local storage management for custom request configurations.

#### Request Management
```typescript
// Save custom request
saveCustomRequest(request: CustomRequest): void

// Load custom requests
getCustomRequests(): CustomRequest[]

// Delete custom request
deleteCustomRequest(id: string): void
```

## 🎯 Context Management

### BenchmarkContext (`src/contexts/BenchmarkContext.tsx`)

Global state management using React Context and useReducer.

#### State Structure
```typescript
interface BenchmarkState {
  instance: InstanceInfo | null;
  testConfig: TestConfiguration;
  testResults: TestResult[];
  metrics: PerformanceMetrics;
  liveConsole: LiveConsoleState;
  selectedScenario: TestSpecification | null;
}
```

#### Actions
```typescript
// Instance management
SET_INSTANCE
UPDATE_INSTANCE_STATUS

// Test configuration
UPDATE_TEST_CONFIG
SET_SELECTED_SCENARIO

// Test execution
ADD_TEST_RESULT
UPDATE_METRICS
SET_LIVE_CONSOLE_LOGS

// UI state
SET_LOADING_STATE
SET_ERROR_STATE
```

#### Usage Example
```typescript
import { useBenchmarkContext } from '@/contexts/BenchmarkContext';

function TestComponent() {
  const { state, dispatch } = useBenchmarkContext();
  
  const updateConfig = (newConfig: TestConfiguration) => {
    dispatch({ type: 'UPDATE_TEST_CONFIG', payload: newConfig });
  };
  
  return <div>{/* Component JSX */}</div>;
}
```

## 🔧 Utility Services

### Logger (`src/utils/logger.ts`)

Comprehensive logging system with level-based filtering and structured output.

#### Logging Methods
```typescript
// Log levels
logger.debug(message: string, component: string, metadata?: any, error?: Error)
logger.info(message: string, component: string, metadata?: any)
logger.warn(message: string, component: string, metadata?: any, error?: Error)
logger.error(message: string, component: string, metadata?: any, error?: Error)
logger.fatal(message: string, component: string, metadata?: any, error?: Error)
```

#### Log Configuration
```typescript
interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
}
```

### Environment Detection (`src/utils/environment.ts`)

Smart environment detection with caching for optimal performance.

#### Detection Methods
```typescript
// Environment checks
isServiceNowEnvironment(): boolean
isDevelopmentMode(): boolean
getInstanceUrl(): string | null

// ServiceNow globals detection
hasServiceNowGlobals(): boolean
getServiceNowSessionToken(): string | null
```

## 📊 Performance Monitoring

### API Cache (`src/utils/apiCache.ts`)

LRU cache implementation with TTL support for API response caching.

#### Cache Methods
```typescript
// Cache management
set(key: string, value: any, ttl?: number): void
get(key: string): any | null
has(key: string): boolean
clear(): void

// Cache statistics
getStats(): CacheStats
```

#### Cache Configuration
```typescript
interface CacheConfig {
  maxSize: number;        // Maximum entries (default: 100)
  defaultTTL: number;     // Default TTL in ms (default: 5 minutes)
  cleanupInterval: number; // Cleanup interval in ms (default: 1 minute)
}
```

## 🛡️ Security Features

### Input Sanitization

All user inputs are automatically sanitized using:
- HTML entity encoding
- SQL injection prevention
- XSS protection
- ServiceNow query syntax validation

### Credential Protection

- Development credentials encrypted using Web Crypto API
- Production tokens cached securely with automatic expiration
- No sensitive data in console logs or error messages
- Secure headers for all ServiceNow API calls

## 🔌 Service Integration

### ServiceNow Field Mappings (`src/utils/serviceNowFieldMappings.ts`)

Comprehensive mapping between REST and GraphQL field naming conventions.

#### Mapping Methods
```typescript
// Field conversion
convertRestFieldToGraphQL(restField: string): string
convertGraphQLFieldToRest(graphqlField: string): string

// Relationship handling
mapDotWalkingFields(fields: string[]): FieldMapping[]
```

## 🚀 Performance Best Practices

### Request Optimization
- Use request queuing to prevent API throttling
- Implement exponential backoff for retry logic
- Cache frequently accessed data with appropriate TTL
- Batch similar requests when possible

### Memory Management
- Clear large response data after processing
- Use pagination for large datasets
- Implement proper cleanup in useEffect hooks
- Monitor memory usage in development

### Error Handling
- Implement circuit breaker pattern for external APIs
- Provide fallback mechanisms for critical functionality
- Log errors with sufficient context for debugging
- Gracefully handle network failures and timeouts

## 📝 Type Definitions

For complete type definitions, refer to:
- `src/types/index.ts` - Core application types
- `src/components/ExecutionArea/LiveConsole/types.ts` - Live Console types
- `src/components/ExecutionArea/Timeline/types.ts` - Timeline component types

## 🧪 Testing Guidelines

### Unit Testing
- Test authentication flows for both development and production modes
- Validate API builders with various input combinations
- Test data comparison logic with edge cases
- Verify caching mechanisms and TTL behavior

### Integration Testing
- Test end-to-end authentication workflows
- Validate API response handling for different ServiceNow versions
- Test error recovery and retry mechanisms
- Verify performance under various load conditions

---

This API reference provides the foundation for understanding and extending the ServiceNow API Benchmark Tool. For implementation examples and detailed usage patterns, refer to the existing component implementations in the codebase.