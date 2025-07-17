import { TestStatus, TestResult, DataComparisonResult } from '../../../types';

export interface LogFilters {
  testTypes: string[];
  logLevels: ('info' | 'success' | 'warning' | 'error')[];
  timeRange?: [Date, Date];
  apiTypes: ('rest' | 'graphql' | 'both')[];
  dataConsistency: 'all' | 'issues-only' | 'perfect-only';
  searchQuery: string;
}

export interface LogEntryAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export interface PerformanceSnapshot {
  restTime: number;
  graphqlTime: number;
  restPayload: number;
  graphqlPayload: number;
  winner: 'rest' | 'graphql' | 'tie';
  requestCount: {
    rest: number;
    graphql: number;
  };
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  category: 'test' | 'performance' | 'data' | 'api' | 'system';
  message: string;
  testId?: string;
  testType?: string;
  metadata?: {
    testStatus?: TestStatus;
    testResult?: TestResult;
    performance?: PerformanceSnapshot;
    dataComparison?: DataComparisonResult;
    apiCall?: {
      type: 'rest' | 'graphql';
      endpoint: string;
      method?: string;
      query?: string;
    };
  };
  actions?: LogEntryAction[];
}

export interface LogGroup {
  id: string;
  testType: string;
  testId: string;
  entries: LogEntry[];
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  isExpanded: boolean;
}