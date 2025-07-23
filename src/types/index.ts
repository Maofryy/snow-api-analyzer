
export interface ServiceNowInstance {
  url: string;
  username: string;
  password: string;
  token: string;
  connected: boolean;
  // Session-based authentication data
  sessionToken?: string;
  sessionExpiry?: Date;
  authMode?: 'basic' | 'session';
  lastTokenRefresh?: Date;
}

export interface TestConfiguration {
  dotWalkingTests: {
    enabled: boolean;
    parameters: {
      table: string;
      recordLimit: number;
    };
    selectedVariants?: string[];
    selectedLimits?: number[];
  };
  multiTableTests: {
    enabled: boolean;
    parameters: {
      recordLimit: number;
    };
    selectedVariants?: string[];
    selectedLimits?: number[];
  };
  schemaTailoringTests: {
    enabled: boolean;
    parameters: {
      recordLimit: number;
    };
    selectedVariants?: string[];
    selectedLimits?: number[];
  };
  performanceScaleTests: {
    enabled: boolean;
    parameters: {
      recordLimit: number;
    };
    selectedVariants?: string[];
    selectedLimits?: number[];
  };
  realWorldScenarios: {
    enabled: boolean;
    parameters: {
      recordLimit: number;
    };
    selectedVariants?: string[];
  };
}

export interface DataComparisonResult {
  isEquivalent: boolean;
  recordCountMatch: boolean;
  dataConsistency: number;
  issues: string[];
  restRecordCount: number;
  graphqlRecordCount: number;
  fieldMismatches: Array<{
    recordIndex: number;
    field: string;
    restValue: unknown;
    graphqlValue: unknown;
    isWarning?: boolean;
  }>;
  onlyKnownIssues?: boolean;
}

export interface TestResult {
  id: string;
  testType: string;
  restApi: {
    responseTime: number;
    payloadSize: number;
    requestCount: number;
    success: boolean;
    error?: string;
    allResponseTimes?: number[];
  };
  graphqlApi: {
    responseTime: number;
    payloadSize: number;
    requestCount: number;
    success: boolean;  
    error?: string;
    allResponseTimes?: number[];
  };
  winner: 'rest' | 'graphql' | 'tie';
  timestamp: Date;
  dataComparison?: DataComparisonResult;
}

export interface TestStatus {
  id: string;
  testType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  restApiCall?: {
    url: string;
    method: string;
    responseTime: number;
    payloadSize: number;
    success: boolean;
    requestBody?: unknown;
    responseBody?: unknown;
    headers?: Record<string, string>;
  };
  graphqlApiCall?: {
    url: string;
    method: string;
    query?: string;
    responseTime: number;
    payloadSize: number;
    success: boolean;
    variables?: unknown;
    requestBody?: unknown;
    responseBody?: unknown;
    headers?: Record<string, string>;
  };
  dataComparison?: DataComparisonResult;
}

export interface PerformanceMetrics {
  restWins: number;
  graphqlWins: number;
  totalTests: number;
  averageRestResponseTime: number;
  averageGraphqlResponseTime: number;
  totalRestPayloadSize: number;
  totalGraphqlPayloadSize: number;
  successRate: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiCallResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  responseTime: number;
  payloadSize: number;
  allResponseTimes: number[];
}

export interface GraphQLFieldStructure {
  [key: string]: boolean | GraphQLFieldStructure;
}

export interface CustomRequest {
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

export interface CustomRequestCategory {
  id: 'customRequests';
  name: 'Custom Requests';
  requests: CustomRequest[];
  enabled: boolean;
}
