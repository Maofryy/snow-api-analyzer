# ServiceNow React App Specifications

> **Comprehensive guide for building React/Vite applications that integrate with ServiceNow**

This document outlines the critical specifications and best practices for developing React applications that interface with ServiceNow instances, based on analysis of an advanced POC implementation.

## Table of Contents

- [Authentication Architecture](#authentication-architecture)
- [Build & Deployment Constraints](#build--deployment-constraints)
- [Environment Configuration](#environment-configuration)
- [API Integration Patterns](#api-integration-patterns)
- [Security Specifications](#security-specifications)
- [Performance Optimizations](#performance-optimizations)
- [ServiceNow-Specific Features](#servicenow-specific-features)
- [Development Workflow](#development-workflow)
- [Additional Specifications](#additional-specifications)
- [Implementation Checklist](#implementation-checklist)

---

## 🔐 Authentication Architecture

### Dual Authentication Modes
ServiceNow React apps must support both development and production authentication patterns:

**Development Mode (Basic Auth)**
- Uses username/password authentication
- Supports external ServiceNow instance URLs
- Enables testing against development/sandbox instances
- Base64 encoded credentials in Authorization header

**Production Mode (Session Token)**
- Leverages ServiceNow session-based authentication
- Uses session cookies and CSRF tokens
- Integrates with ServiceNow's built-in security model
- Automatic token refresh mechanisms

### Environment Detection
Automatic environment detection is crucial:

```typescript
// Key detection patterns
const hasServiceNowGlobals = 
  window.g_ck !== undefined ||
  window.NOW !== undefined ||
  window.g_user !== undefined;

const isServiceNowDomain = hostname.includes("service-now.com") || 
                          hostname.includes("servicenow.com");
```

### Token Management Requirements
- Session token caching with TTL (5-minute default)
- Automatic refresh on 401/403 responses
- Graceful fallback and error handling
- Token endpoint: `/api/x_[scope]_[app]/app/get-token`

---

## 🔨 Build & Deployment Constraints

### Single File Distribution
ServiceNow deployment requires everything bundled into a single HTML file:

**Key Vite Configuration:**
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'production' && viteSingleFile(),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
      }
    },
    cssCodeSplit: false, // Inline all CSS
  }
}));
```

**Required Dependencies:**
- `vite-plugin-singlefile` - Bundles everything into single HTML
- `terser` - Code minification with configurable console.log retention

### Asset Optimization
- All images/fonts must be base64 encoded or externally hosted
- CSS must be inlined (no separate stylesheets)
- JavaScript must be embedded in HTML
- Source maps only for development builds

---

## 🌐 Environment Configuration

### Multi-Environment Support

**Development Environment:**
- External instance URLs (e.g., `https://dev12345.service-now.com`)
- Basic authentication with credentials
- Full console logging enabled
- Source maps generation
- Hot module replacement

**Production Environment:**
- Relative URLs for ServiceNow integration
- Session-based authentication
- Minimal logging (errors only)
- Optimized/minified builds
- CORS properly configured

### Environment Variables
```env
# .env.development
VITE_ENV_MODE=development
VITE_INSTANCE_URL=https://your-dev-instance.service-now.com

# .env.production  
VITE_ENV_MODE=production
```

---

## 📡 API Integration Patterns

### Dual Protocol Support
Applications should support both REST and GraphQL APIs:

**REST API Pattern:**
```typescript
// Endpoint: /api/now/table/{table_name}
const restUrl = `/api/now/table/${table}?sysparm_fields=${fields}&sysparm_limit=${limit}`;
```

**GraphQL API Pattern:**
```typescript
// Endpoint: /api/now/graphql
const graphqlQuery = `
  query {
    ${table}(limit: ${limit}) {
      ${fields.join('\n      ')}
    }
  }
`;
```

### ServiceNow Table Integration
- Pre-configured field mappings for standard tables (incident, change_request, problem, etc.)
- Support for reference field dot-walking
- Automatic field validation based on table schema
- Dynamic field discovery capabilities

### Request Management
- Request queuing with rate limiting (100ms default delay)
- Retry mechanisms for failed requests
- Timeout handling (30-second default)
- Concurrent request management

---

## 🛡️ Security Specifications

### Credential Management
**Development Storage (Client-side only):**
```typescript
// Basic obfuscation - NOT cryptographically secure
function obfuscate(text: string): string {
  return btoa(text.split('').reverse().join(''));
}
```

**Production Security:**
- No credential storage in client
- Session token management only
- Proper HTTPS enforcement
- CSRF protection via headers

### Input Sanitization
```typescript
// URL sanitization
export function sanitizeUrl(url: string): string {
  const sanitized = url.replace(/[<>'"]/g, '');
  if (!sanitized.startsWith('https://') && !sanitized.startsWith('http://')) {
    return `https://${sanitized}`;
  }
  return sanitized;
}
```

### Security Headers
```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-UserToken': sessionToken,
  'X-Requested-With': 'XMLHttpRequest',
};
```

---

## ⚡ Performance Optimizations

### Caching Strategy
- API response caching with configurable TTL
- Smart cache invalidation
- Cache statistics and monitoring
- Memory-efficient cache management

### Bundle Optimization
```typescript
// Terser configuration
terserOptions: {
  compress: {
    drop_console: false, // Keep for debugging
    drop_debugger: mode === 'production'
  }
}
```

### Request Optimization
- Randomized API call execution order
- Payload size monitoring
- Response time tracking
- Connection pooling considerations

---

## 🎯 ServiceNow-Specific Features

### Standard Table Support
Pre-configured support for common ServiceNow tables:
- `incident` - IT service disruptions
- `change_request` - System modifications
- `problem` - Root cause analysis
- `sc_request` - Service catalog requests
- `sys_user` - User management
- `cmdb_ci` - Configuration items
- `kb_knowledge` - Knowledge articles

### Field Mapping Architecture
```typescript
export interface TableFieldMapping {
  table: string;
  displayName: string;
  commonFields: string[];
  referenceFields: string[];
  auditFields: string[];
  description: string;
}
```

### ServiceNow Integration Points
- Session cookie handling (`credentials: 'include'`)
- Standard API endpoints (`/api/now/table`, `/api/now/graphql`)
- ServiceNow global variable detection
- Proper error handling for ServiceNow-specific errors

---

## 🔧 Development Workflow

### Technology Stack
**Core Technologies:**
- React 18+ with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui component library

**State Management:**
- React Context for global state
- TypeScript for type safety
- Custom hooks for reusable logic

**Development Tools:**
- ESLint with TypeScript rules
- Hot module replacement
- Source map generation
- Component development environment

---

## 📦 Additional Specifications

### Critical Requirements

1. **Multi-Instance Support**
   - Configuration management for multiple ServiceNow instances
   - Instance-specific authentication handling
   - Connection testing and validation

2. **Real-time Monitoring**
   - Live request/response tracking
   - Performance metrics collection
   - Error logging and reporting
   - Console-based debugging interface

3. **Data Validation**
   - Response comparison between APIs
   - Data consistency verification
   - Field-level mismatch detection
   - Automated data quality reports

### Technical Constraints

1. **Memory Management**
   - Efficient large dataset handling
   - Response caching strategies
   - Memory leak prevention
   - Garbage collection optimization

2. **Browser Compatibility**
   - ServiceNow embedded browser support
   - Cross-browser compatibility testing
   - Polyfill management
   - Progressive enhancement

3. **Network Resilience**
   - Automatic retry mechanisms
   - Timeout configuration
   - Connection quality detection
   - Offline capability considerations

For a complete step-by-step setup guide, see the [ServiceNow React App Setup Protocol](./ServiceNow%20React%20App%20Setup%20Protocol.md).

---

## ✅ Implementation Checklist

### Core Infrastructure
- [ ] Vite build system with single-file output
- [ ] TypeScript configuration with strict mode
- [ ] Tailwind CSS with custom design system
- [ ] ESLint with TypeScript rules

### Authentication System
- [ ] Environment detection utility
- [ ] Dual authentication modes (basic/session)
- [ ] Token management with caching
- [ ] Security headers implementation

### ServiceNow Integration
- [ ] REST API service layer
- [ ] GraphQL API support
- [ ] Table field mappings
- [ ] Error handling and retry logic

### Development Tools
- [ ] Hot module replacement setup
- [ ] Source map generation
- [ ] Development server configuration
- [ ] Build optimization settings

### Testing & Quality
- [ ] Connection testing utilities
- [ ] Error boundary implementation
- [ ] Input validation and sanitization
- [ ] Performance monitoring hooks

### Documentation
- [ ] API documentation
- [ ] Setup instructions
- [ ] Configuration examples
- [ ] Troubleshooting guide

---

## 🔗 Additional Resources

- [ServiceNow REST API Documentation](https://docs.servicenow.com/bundle/tokyo-application-development/page/integrate/inbound-rest/concept/c_RESTAPI.html)
- [ServiceNow GraphQL API Documentation](https://docs.servicenow.com/bundle/tokyo-application-development/page/integrate/graphql/concept/graphql-landing.html)
- [Vite Documentation](https://vitejs.dev/)
- [React 18 Documentation](https://react.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Compatibility:** ServiceNow Tokyo+, React 18+, Vite 5+