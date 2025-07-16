Custom Request Feature Implementation Plan

     🏗️ Architecture Overview

     Feature Goal

     Add capability for developers to define, save, and execute custom REST and GraphQL requests alongside predefined benchmark tests, with full performance comparison and validation.

     📊 Phase 1: Data Model & Core Architecture

     1.1 Custom Request Data Models

     interface CustomRequest {
       id: string;
       name: string;
       description?: string;
       table: string;
       restConfig: {
         fields: string[];
         filters?: string;
         orderBy?: string;
         limit?: number;
       };
       graphqlConfig: {
         fields: GraphQLFieldStructure;
         filters?: string;
         orderBy?: string;
         limit?: number;
       };
       tags?: string[];
       createdAt: Date;
       updatedAt: Date;
     }

     interface CustomRequestCategory {
       id: 'customRequests';
       name: 'Custom Requests';
       requests: CustomRequest[];
       enabled: boolean;
     }

     1.2 State Management Extensions

     - Extend BenchmarkState with customRequests: CustomRequest[]
     - Add reducer actions: ADD_CUSTOM_REQUEST, UPDATE_CUSTOM_REQUEST, DELETE_CUSTOM_REQUEST
     - Integrate with existing test configuration and execution flow

     🎨 Phase 2: User Interface Components

     2.1 Custom Request Manager

     - Location: New tab in TestConfiguration area
     - Features: Create, edit, delete, import/export custom requests
     - UI Pattern: Follow existing TestCategoryPanel structure

     2.2 Request Builder Interface

     ┌─ Custom Request Builder ─────────────────────────┐
     │ Name: [Performance Test - Incidents with Caller] │
     │ Table: [incident ▼]                              │
     │                                                  │
     │ ┌─ REST Configuration ─────────────────┐        │
     │ │ Fields: [number, short_description,   │        │
     │ │         caller_id.name, sys_created_on] │       │
     │ │ Filters: [state=1^priority<=2]         │        │
     │ │ Limit: [100 ▼]                        │        │
     │ └───────────────────────────────────────┘        │
     │                                                  │
     │ ┌─ GraphQL Configuration ──────────────┐        │
     │ │ Fields: {                            │        │
     │ │   number                             │        │
     │ │   short_description                  │        │
     │ │   caller_id {                        │        │
     │ │     _reference                       │        │
     │ │     name                             │        │
     │ │   }                                  │        │
     │ │   sys_created_on                     │        │
     │ │ }                                    │        │
     │ └─────────────────────────────────────┘        │
     │                                                  │
     │ [Validate] [Save] [Test Now] [Export]           │
     └──────────────────────────────────────────────────┘

     2.3 Request Library

     - Saved request list with search/filter capabilities
     - Quick actions: duplicate, edit, delete, share
     - Import/export functionality for request sharing

     🔧 Phase 3: Core Implementation

     3.1 Enhanced API Builders

     // Extend existing apiBuilders.ts
     export function buildCustomRestUrl(request: CustomRequest, instance: ServiceNowInstance): APIBuildResult {
       return buildRestUrl(
         request.table,
         request.restConfig.fields,
         request.restConfig.limit || 10,
         instance,
         request.restConfig.filters,
         request.restConfig.orderBy
       );
     }

     export function buildCustomGraphQLQuery(request: CustomRequest): APIBuildResult {
       return buildGraphQLQuery(
         request.table,
         request.graphqlConfig.fields,
         request.graphqlConfig.limit || 10,
         request.graphqlConfig.filters,
         request.graphqlConfig.orderBy
       );
     }

     3.2 Test Specification Integration

     - Extend testSpecs.ts with dynamic custom request category
     - Runtime test generation from saved custom requests
     - Maintain existing test execution patterns

     3.3 Validation Framework

     - Real-time validation: Field syntax, table existence, filter syntax
     - Test preview: Show generated URLs/queries before execution
     - Compatibility checks: Ensure REST and GraphQL requests target equivalent data

     💾 Phase 4: Persistence & Management

     4.1 Storage Strategy

     - Local Storage: Browser localStorage for user-specific requests
     - Export/Import: JSON format for sharing between developers
     - Future: Optional cloud sync capability

     4.2 Request Templates

     const requestTemplates = {
       basicFieldSelection: {
         name: "Basic Field Selection",
         restFields: ["number", "short_description", "state"],
         graphqlFields: { number: true, short_description: true, state: true }
       },
       relationshipTraversal: {
         name: "Single Relationship",
         restFields: ["number", "caller_id.name", "caller_id.email"],
         graphqlFields: {
           number: true,
           caller_id: { _reference: true, name: true, email: true }
         }
       }
     };

     🚀 Phase 5: Enhanced Features

     5.1 Advanced Request Building

     - Visual query builder: Drag-and-drop field selection
     - Relationship explorer: Visual tree for nested relationships
     - Field suggestions: Auto-complete based on table schema

     5.2 Performance Analysis

     - Historical tracking: Save performance metrics for custom requests
     - Comparison views: Compare multiple custom requests
     - Performance baselines: Set expected performance thresholds

     5.3 Collaboration Features

     - Request sharing: Export/import with metadata
     - Team libraries: Shared request collections
     - Best practices: Built-in optimization suggestions

     🔄 Integration Points

     Existing System Integration

     1. TestConfiguration: Add custom request panel alongside existing categories
     2. Execution Engine: Process custom requests using existing performance measurement
     3. Results Display: Show custom request results in existing scoreboard/console
     4. Data Comparison: Apply existing validation logic to custom request responses

     Backward Compatibility

     - Zero impact on existing predefined tests
     - Custom requests as additive feature
     - Existing UI/UX patterns maintained

     📈 Success Metrics

     Developer Experience

     - Time to create custom request < 2 minutes
     - Request validation catches 95%+ of errors before execution
     - Performance measurement accuracy matches predefined tests

     System Performance

     - No performance impact on existing features
     - Custom request execution within 10% of predefined test performance
     - Storage efficient (< 1MB for 100 custom requests)

     🎯 Implementation Priority

     High Priority (Core MVP):
     - Basic custom request CRUD operations
     - Integration with existing test execution
     - Simple field selection UI
     - Local storage persistence
