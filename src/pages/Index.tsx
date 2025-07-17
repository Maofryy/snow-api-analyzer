
import React, { useEffect, useState } from 'react';
import { BenchmarkProvider } from '../contexts/BenchmarkContext';
import { ServiceNowInstance } from '../types';
import { Header } from '../components/Header/Header';
import { TestConfiguration } from '../components/TestConfiguration/TestConfiguration';
import { ExecutionArea } from '../components/ExecutionArea/ExecutionArea';
import { Scoreboard } from '../components/Scoreboard/Scoreboard';
import { TestSpecsExplorer } from '../components/TestSpecs/TestSpecsExplorer';
import { useBenchmark } from '../contexts/BenchmarkContext';
import { makeAuthenticatedRequest, isAuthError, getAuthErrorMessage, getAuthStatus, isProductionMode } from '../services/authService';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
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
      console.log('Initializing connection with auth status:', authStatus);
      console.log('Window location:', window.location.href);
      console.log('Window globals check:', {
        // @ts-ignore
        g_ck: typeof window.g_ck !== 'undefined',
        // @ts-ignore
        NOW: typeof window.NOW !== 'undefined',
        // @ts-ignore
        g_user: typeof window.g_user !== 'undefined'
      });
      
      if (authStatus.isSessionAuth) {
        // Production mode - fetch instance info then test connection
        console.log('Using production mode (session auth)');
        await fetchInstanceInfo();
      } else {
        // Development mode - use environment variables for basic auth
        console.log('Environment variables:', {
          url: import.meta.env.VITE_INSTANCE_URL,
          username: import.meta.env.VITE_APP_USER,
          password: import.meta.env.VITE_APP_PASSWORD ? '***' : 'undefined'
        });
        
        const instance: ServiceNowInstance = {
          url: import.meta.env.VITE_INSTANCE_URL,
          username: import.meta.env.VITE_APP_USER,
          password: import.meta.env.VITE_APP_PASSWORD,
          token: '',
          connected: false,
          authMode: 'basic'
        };

        if (instance.url && instance.username && instance.password) {
          console.log('Setting instance for development mode:', {
            url: instance.url,
            username: instance.username,
            password: instance.password ? '***' : 'undefined',
            authMode: instance.authMode
          });
          // Set instance for development mode
          apiService.setInstance(instance);
          await testConnection();
        } else {
          console.error('Missing environment variables for development mode:', {
            url: !!instance.url,
            username: !!instance.username,
            password: !!instance.password
          });
        }
      }
    };

    initializeConnection();
  }, [dispatch]);

  const fetchInstanceInfo = async () => {
    try {
      console.log('Production mode: fetching token first...');
      
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
      console.log('Token response:', tokenData);
      
      // Extract token from nested response structure
      const token = tokenData.result?.token;
      if (!token) {
        throw new Error('No token found in response');
      }
      
      console.log('Token fetched successfully');
      
      // Now fetch instance info using the token
      console.log('Fetching instance info with token:', token);
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
      console.log('Instance info response:', instanceData);
      
      // Extract instance data from nested response structure
      const instanceInfo = instanceData.result || instanceData;
      console.log('Extracted instance info:', instanceInfo);
      
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
      
      console.log('Setting instance for production mode:', instance);
      apiService.setInstance(instance);
      
      // Now test connection - this will trigger token fetch via tokenManager
      console.log('Calling testConnection...');
      await testConnection();
    } catch (error) {
      console.error('Error in production mode setup:', error);
    }
  };

  const testConnection = async () => {
    try {
      console.log('Starting connection test...');
      const result = await apiService.testConnection();
      console.log('Connection test result:', result);
      
      if (result.success) {
        const authStatus = getAuthStatus();
        console.log('Auth status:', authStatus);
        
        // For production mode, get instance info from current context
        if (authStatus.isSessionAuth) {
          console.log('Setting connected instance for production mode');
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
          console.log('Setting connected instance for development mode');
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
      } else {
        console.error('Connection test failed:', result.error);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      
      if (isAuthError(error)) {
        console.error('Authentication error:', getAuthErrorMessage(error));
      }
    }
  };

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
    
    if (result.success) {
      console.log('Test execution completed successfully for spec:', spec.name);
    } else {
      console.error('Test execution failed:', result.error);
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
