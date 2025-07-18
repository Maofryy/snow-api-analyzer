
import React, { useEffect, useState, useCallback } from 'react';
import { BenchmarkProvider } from '../contexts/BenchmarkContext';
import { ServiceNowInstance } from '../types';
import { Header } from '../components/Header/Header';
import { TestConfiguration } from '../components/TestConfiguration/TestConfiguration';
import { ExecutionArea } from '../components/ExecutionArea/ExecutionArea';
import { Scoreboard } from '../components/Scoreboard/Scoreboard';
import { TestSpecsExplorer } from '../components/TestSpecs/TestSpecsExplorer';
import { useBenchmark } from '../contexts/BenchmarkContext';
import { isAuthError, getAuthErrorMessage, getAuthStatus, isProductionMode } from '../services/authService';
import { apiService } from '../services/apiService';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ProcessedTestSpec } from '../services/testSpecsService';
import { TestExecutionService } from '../services/testExecutionService';
import { Info, Play, BookOpen } from 'lucide-react';

function BenchmarkDashboard() {
  const { state, dispatch } = useBenchmark();
  const [activeTab, setActiveTab] = useState('benchmark');

  useEffect(() => {
    const initializeConnection = async () => {
      const authStatus = getAuthStatus();
      // Initialize connection based on auth status
      
      if (authStatus.isSessionAuth) {
        // Production mode - fetch instance info then test connection
        await fetchInstanceInfo();
      } else {
        // Development mode - use environment variables for basic auth
        
        const instance: ServiceNowInstance = {
          url: import.meta.env.VITE_INSTANCE_URL,
          username: import.meta.env.VITE_APP_USER,
          password: import.meta.env.VITE_APP_PASSWORD,
          token: '',
          connected: false,
          authMode: 'basic'
        };

        if (instance.url && instance.username && instance.password) {
          // Set instance for development mode
          apiService.setInstance(instance);
          await testConnection();
        }
      }
    };

    initializeConnection();
  }, []);

  const testConnection = useCallback(async () => {
    try {
      const result = await apiService.testConnection();
      
      if (result.success) {
        const authStatus = getAuthStatus();
        
        // For production mode, get instance info from current context
        if (authStatus.isSessionAuth) {
          dispatch({
            type: 'SET_INSTANCE',
            payload: {
              url: window.location.origin,
              username: 'current_user',
              password: '',
              token: '',
              connected: true,
              authMode: 'session'
            },
          });
        } else {
          // Development mode - instance already set via apiService.setInstance()
          const instance: ServiceNowInstance = {
            url: import.meta.env.VITE_INSTANCE_URL,
            username: import.meta.env.VITE_APP_USER,
            password: import.meta.env.VITE_APP_PASSWORD,
            token: '',
            connected: true,
            authMode: 'basic'
          };
          
          dispatch({
            type: 'SET_INSTANCE',
            payload: instance,
          });
        }
      }
    } catch (error) {
      if (isAuthError(error)) {
        getAuthErrorMessage(error);
      }
    }
  }, [dispatch]);

  const fetchInstanceInfo = useCallback(async () => {
    try {
      // First, get a token to authenticate subsequent requests
      const tokenResponse = await fetch('/api/elosa/api_benchmark/get-token', {
        method: 'GET',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // Required by ServiceNow
        }
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Token fetch failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }
      
      const tokenData = await tokenResponse.json();
      
      // Extract token from nested response structure
      const token = tokenData.result?.token;
      if (!token) {
        throw new Error('No token found in response');
      }
      
      // Now fetch instance info using the token
      const instanceResponse = await fetch('/api/elosa/api_benchmark/instance-info', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-UserToken': token // Use the extracted token for authentication
        }
      });
      
      if (!instanceResponse.ok) {
        throw new Error(`Instance info fetch failed: ${instanceResponse.status} ${instanceResponse.statusText}`);
      }
      
      const instanceData = await instanceResponse.json();
      
      // Extract instance data from nested response structure
      const instanceInfo = instanceData.result || instanceData;
      
      if (!instanceInfo.url || !instanceInfo.username) {
        throw new Error('Invalid instance info response - missing url or username');
      }
      
      // Set instance for production mode - let authService handle token via tokenManager
      const instance: ServiceNowInstance = {
        url: instanceInfo.url,
        username: instanceInfo.username,
        password: '',
        token: '', // Token will be managed by tokenManager
        connected: false,
        authMode: 'session'
      };
      
      apiService.setInstance(instance);
      
      // Now test connection - this will trigger token fetch via tokenManager
      await testConnection();
    } catch (error) {
      // Error in production mode setup
    }
  }, [testConnection]);

  const handleRunTestFromSpecs = async (spec: ProcessedTestSpec) => {
    // Map the test spec to the existing test configuration format
    const categoryKey = (() => {
      switch (spec.category) {
        case 'Dot-Walking Performance': return 'dotWalkingTests';
        case 'Multi-Table Queries': return 'multiTableTests';
        case 'Schema Tailoring': return 'schemaTailoringTests';
        case 'Performance at Scale': return 'performanceScaleTests';
        case 'Real-World Scenarios': return 'realWorldScenarios';
        default: return 'dotWalkingTests';
      }
    })();
    
    // Enable the specific test category and configure it
    dispatch({
      type: 'UPDATE_TEST_CONFIG',
      payload: {
        // First disable all tests
        dotWalkingTests: { ...state.testConfiguration.dotWalkingTests, enabled: false },
        multiTableTests: { ...state.testConfiguration.multiTableTests, enabled: false },
        schemaTailoringTests: { ...state.testConfiguration.schemaTailoringTests, enabled: false },
        performanceScaleTests: { ...state.testConfiguration.performanceScaleTests, enabled: false },
        realWorldScenarios: { ...state.testConfiguration.realWorldScenarios, enabled: false },
        // Then enable and configure the selected test
        [categoryKey]: {
          enabled: true,
          parameters: {
            table: spec.table,
            recordLimit: spec.recordLimits[0], // Use first record limit as default
          },
          selectedVariants: spec.variant ? [spec.variant] : undefined,
          selectedLimits: [spec.recordLimits[0]],
        },
      },
    });
    
    // Wait a moment for the configuration to be applied
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Execute the tests using the test execution service
    const result = await TestExecutionService.executeTests(
      state.instance,
      {
        ...state.testConfiguration,
        [categoryKey]: {
          enabled: true,
          parameters: {
            table: spec.table,
            recordLimit: spec.recordLimits[0],
          },
          selectedVariants: spec.variant ? [spec.variant] : undefined,
          selectedLimits: [spec.recordLimits[0]],
        },
      },
      dispatch
    );
    
    if (!result.success) {
      // Test execution failed
    }
  };

  const handleSwitchToBenchmark = () => {
    setActiveTab('benchmark');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Production Mode Information */}
        {isProductionMode() && (
          <Alert className="mb-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Production Mode:</strong> This application is running inside ServiceNow using session authentication. 
              Instance configuration is automatically managed through your ServiceNow session.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="benchmark" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              API Benchmark
            </TabsTrigger>
            <TabsTrigger value="test-specs" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Test Explorer
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="benchmark" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left side - Test Configuration and Execution (70% width) */}
              <div className="lg:col-span-3 space-y-8">
                <TestConfiguration />
                <ExecutionArea />
              </div>
              
              {/* Right side - Scoreboard (30% width) */}
              <div className="lg:col-span-1">
                <Scoreboard />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="test-specs" className="mt-0">
            <TestSpecsExplorer 
              onRunTest={handleRunTestFromSpecs}
              onSwitchToBenchmark={handleSwitchToBenchmark}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const Index = () => {
  return (
    <BenchmarkProvider>
      <BenchmarkDashboard />
    </BenchmarkProvider>
  );
};

export default Index;
