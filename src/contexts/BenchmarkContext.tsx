
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TestConfiguration, TestResult, TestStatus, PerformanceMetrics, ServiceNowInstance } from '../types';

interface BenchmarkState {
  instance: ServiceNowInstance;
  testConfiguration: TestConfiguration;
  testResults: TestResult[];
  testStatuses: TestStatus[];
  performanceMetrics: PerformanceMetrics;
  isRunning: boolean;
}

type BenchmarkAction =
  | { type: 'SET_INSTANCE'; payload: ServiceNowInstance }
  | { type: 'UPDATE_TEST_CONFIG'; payload: Partial<TestConfiguration> }
  | { type: 'ADD_TEST_RESULT'; payload: TestResult }
  | { type: 'UPDATE_TEST_STATUS'; payload: TestStatus }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'RESET_TESTS' }
  | { type: 'UPDATE_METRICS'; payload: PerformanceMetrics };

const initialState: BenchmarkState = {
  instance: {
    url: '',
    username: '',
    password: '',
    token: '',
    connected: false,
  },
  testConfiguration: {
    fieldSelectionTests: {
      enabled: true,
      parameters: {
        table: 'incident',
        recordLimit: 100,
        fieldSets: ['minimal', 'standard', 'full'],
      },
    },
    relationshipTests: {
      enabled: true,
      parameters: {
        depth: 3,
        relationships: ['caller', 'assigned_to', 'ci_item'],
      },
    },
    filteringTests: {
      enabled: true,
      parameters: {
        table: 'incident',
        filterComplexity: 'complex',
      },
    },
    paginationTests: {
      enabled: true,
      parameters: {
        pageSize: 50,
        totalRecords: 500,
      },
    },
  },
  testResults: [],
  testStatuses: [],
  performanceMetrics: {
    restWins: 0,
    graphqlWins: 0,
    totalTests: 0,
    averageRestResponseTime: 0,
    averageGraphqlResponseTime: 0,
    totalRestPayloadSize: 0,
    totalGraphqlPayloadSize: 0,
    successRate: 0,
  },
  isRunning: false,
};

function benchmarkReducer(state: BenchmarkState, action: BenchmarkAction): BenchmarkState {
  switch (action.type) {
    case 'SET_INSTANCE':
      return { ...state, instance: action.payload };
    case 'UPDATE_TEST_CONFIG':
      return { 
        ...state, 
        testConfiguration: { ...state.testConfiguration, ...action.payload } 
      };
    case 'ADD_TEST_RESULT':
      return { 
        ...state, 
        testResults: [...state.testResults, action.payload] 
      };
    case 'UPDATE_TEST_STATUS':
      const updatedStatuses = state.testStatuses.filter(s => s.id !== action.payload.id);
      return { 
        ...state, 
        testStatuses: [...updatedStatuses, action.payload] 
      };
    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload };
    case 'RESET_TESTS':
      return { 
        ...state, 
        testResults: [], 
        testStatuses: [], 
        performanceMetrics: initialState.performanceMetrics 
      };
    case 'UPDATE_METRICS':
      return { ...state, performanceMetrics: action.payload };
    default:
      return state;
  }
}

interface BenchmarkContextType {
  state: BenchmarkState;
  dispatch: React.Dispatch<BenchmarkAction>;
}

const BenchmarkContext = createContext<BenchmarkContextType | undefined>(undefined);

export function BenchmarkProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(benchmarkReducer, initialState);

  return (
    <BenchmarkContext.Provider value={{ state, dispatch }}>
      {children}
    </BenchmarkContext.Provider>
  );
}

export function useBenchmark() {
  const context = useContext(BenchmarkContext);
  if (context === undefined) {
    throw new Error('useBenchmark must be used within a BenchmarkProvider');
  }
  return context;
}
