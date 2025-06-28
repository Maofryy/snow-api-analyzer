
export interface ServiceNowInstance {
  url: string;
  username: string;
  password: string;
  token: string;
  connected: boolean;
}

export interface TestConfiguration {
  fieldSelectionTests: {
    enabled: boolean;
    parameters: {
      table: string;
      recordLimit: number;
      fieldSets: string[];
    };
  };
  relationshipTests: {
    enabled: boolean;
    parameters: {
      depth: number;
      relationships: string[];
    };
  };
  filteringTests: {
    enabled: boolean;
    parameters: {
      table: string;
      filterComplexity: 'simple' | 'complex' | 'nested';
    };
  };
  paginationTests: {
    enabled: boolean;
    parameters: {
      pageSize: number;
      totalRecords: number;
    };
  };
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
  };
  graphqlApi: {
    responseTime: number;
    payloadSize: number;
    requestCount: number;
    success: boolean;  
    error?: string;
  };
  winner: 'rest' | 'graphql' | 'tie';
  timestamp: Date;
}

export interface TestStatus {
  id: string;
  testType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
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
