
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { TestResult, TestStatus, PerformanceMetrics, ServiceNowInstance, TestConfiguration, CustomRequest } from '../types';
import { storeCredentials, retrieveCredentials, clearCredentials } from '../utils/secureStorage';
import { loadCustomRequestsFromStorage, saveCustomRequestsToStorage } from '../utils/customRequestStorage';

interface BenchmarkState {
  instance: ServiceNowInstance;
  testConfiguration: TestConfiguration;
  testResults: TestResult[];
  testStatuses: TestStatus[];
  performanceMetrics: PerformanceMetrics;
  isRunning: boolean;
  customRequests: CustomRequest[];
  completionModalDismissed: boolean;
}

type BenchmarkAction =
  | { type: 'SET_INSTANCE'; payload: ServiceNowInstance }
  | { type: 'UPDATE_TEST_CONFIG'; payload: Partial<TestConfiguration> }
  | { type: 'ADD_TEST_RESULT'; payload: TestResult }
  | { type: 'UPDATE_TEST_STATUS'; payload: TestStatus }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'RESET_TESTS' }
  | { type: 'UPDATE_METRICS'; payload: PerformanceMetrics }
  | { type: 'ADD_CUSTOM_REQUEST'; payload: CustomRequest }
  | { type: 'UPDATE_CUSTOM_REQUEST'; payload: CustomRequest }
  | { type: 'DELETE_CUSTOM_REQUEST'; payload: string }
  | { type: 'SET_COMPLETION_MODAL_DISMISSED'; payload: boolean };

const getInitialState = (): BenchmarkState => {
  const storedCredentials = retrieveCredentials();
  const storedCustomRequests = loadCustomRequestsFromStorage();
  return {
    instance: {
      url: storedCredentials?.url || '',
      username: storedCredentials?.username || '',
      password: storedCredentials?.password || '',
      token: storedCredentials?.token || '',
      connected: false,
    },
  testConfiguration: {
    dotWalkingTests: {
      enabled: true,
      parameters: {
        table: 'incident',
        recordLimit: 50,
      },
      selectedVariants: undefined,
      selectedLimits: undefined,
    },
    multiTableTests: {
      enabled: false,
      parameters: {
        recordLimit: 25,
      },
      selectedVariants: undefined,
      selectedLimits: undefined,
    },
    schemaTailoringTests: {
      enabled: false,
      parameters: {
        recordLimit: 100,
      },
      selectedVariants: undefined,
      selectedLimits: undefined,
    },
    performanceScaleTests: {
      enabled: false,
      parameters: {
        recordLimit: 500,
      },
      selectedVariants: undefined,
      selectedLimits: undefined,
    },
    realWorldScenarios: {
      enabled: false,
      parameters: {
        recordLimit: 5,
      },
      selectedVariants: undefined,
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
    customRequests: storedCustomRequests,
    completionModalDismissed: false,
  };
};

const initialState: BenchmarkState = getInitialState();

function benchmarkReducer(state: BenchmarkState, action: BenchmarkAction): BenchmarkState {
  switch (action.type) {
    case 'SET_INSTANCE':
      // Securely store credentials when instance is updated
      try {
        storeCredentials(action.payload);
      } catch (error) {
        console.error('Failed to store credentials securely:', error);
      }
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
    case 'UPDATE_TEST_STATUS': {
      const updatedStatuses = state.testStatuses.filter(s => s.id !== action.payload.id);
      return { 
        ...state, 
        testStatuses: [...updatedStatuses, action.payload] 
      };
    }
    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload };
    case 'RESET_TESTS':
      return { 
        ...state, 
        testResults: [], 
        testStatuses: [], 
        performanceMetrics: initialState.performanceMetrics,
        completionModalDismissed: false
      };
    case 'UPDATE_METRICS':
      return { ...state, performanceMetrics: action.payload };
    case 'ADD_CUSTOM_REQUEST': {
      const newCustomRequests = [...state.customRequests, action.payload];
      saveCustomRequestsToStorage(newCustomRequests);
      return { 
        ...state, 
        customRequests: newCustomRequests
      };
    }
    case 'UPDATE_CUSTOM_REQUEST': {
      const updatedCustomRequests = state.customRequests.map(req => 
        req.id === action.payload.id ? action.payload : req
      );
      saveCustomRequestsToStorage(updatedCustomRequests);
      return { 
        ...state, 
        customRequests: updatedCustomRequests
      };
    }
    case 'DELETE_CUSTOM_REQUEST': {
      const filteredCustomRequests = state.customRequests.filter(req => req.id !== action.payload);
      saveCustomRequestsToStorage(filteredCustomRequests);
      return { 
        ...state, 
        customRequests: filteredCustomRequests
      };
    }
    case 'SET_COMPLETION_MODAL_DISMISSED':
      return { ...state, completionModalDismissed: action.payload };
    default:
      return state;
  }
}

interface BenchmarkContextType {
  state: BenchmarkState;
  dispatch: React.Dispatch<BenchmarkAction>;
  clearStoredCredentials: () => void;
}

// Helper function to safely clear stored credentials
function clearStoredCredentials(): void {
  try {
    clearCredentials();
  } catch (error) {
    console.error('Failed to clear stored credentials:', error);
  }
}

const BenchmarkContext = createContext<BenchmarkContextType | undefined>(undefined);

export function BenchmarkProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(benchmarkReducer, initialState);

  // Clear credentials when component unmounts for security
  useEffect(() => {
    return () => {
      // Only clear credentials if user explicitly disconnects
      // Don't clear on every unmount to preserve user session
    };
  }, []);

  return (
    <BenchmarkContext.Provider value={{ state, dispatch, clearStoredCredentials }}>
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
