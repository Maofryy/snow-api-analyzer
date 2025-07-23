export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'test_start' | 'test_progress' | 'api_call' | 'test_complete' | 'test_failed' | 'info' | 'debug' | 'error';
  testId: string;
  level: 'info' | 'debug' | 'error' | 'success' | 'warning';
  message: string;
  metadata?: {
    progress?: number;
    responseTime?: number;
    apiType?: 'rest' | 'graphql';
    apiUrl?: string;
    apiMethod?: string;
    payloadSize?: number;
    success?: boolean;
    error?: string;
    iteration?: number;
    totalIterations?: number;
    dataComparison?: any;
    winner?: 'rest' | 'graphql' | 'tie';
  };
}

export interface TimelineTest {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  progress: number;
  events: TimelineEvent[];
  summary?: {
    restResponseTime?: number;
    graphqlResponseTime?: number;
    winner?: 'rest' | 'graphql' | 'tie';
    dataConsistency?: number;
    totalDuration?: number;
    restPayloadSize?: number;
    graphqlPayloadSize?: number;
  };
}

export interface TimelineFilters {
  testStatus?: ('pending' | 'running' | 'completed' | 'failed')[];
  eventTypes?: TimelineEvent['type'][];
  eventLevels?: TimelineEvent['level'][];
  searchTerm?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TimelineViewProps {
  className?: string;
  onExport?: (data: any) => void;
  onTestSelect?: (testId: string) => void;
  autoScroll?: boolean;
  maxEvents?: number;
}