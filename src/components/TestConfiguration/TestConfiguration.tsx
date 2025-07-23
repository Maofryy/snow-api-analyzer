
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestCategoryPanel } from './TestCategoryPanel';
import { CustomRequestManager } from './CustomRequestManager';
import { RequestBuilder } from './RequestBuilder';
import { useBenchmark } from '../../contexts/BenchmarkContext';
import { testSpecs } from '../../specs/testSpecs';
import { buildRestUrl, buildGraphQLQuery, buildCustomRestUrl, buildCustomGraphQLQuery, buildMultiTableGraphQLQuery, validateMultiTableScenario } from '../../utils/apiBuilders';
import { compareApiResponses, compareMultiTableApiResponses } from '../../utils/dataComparison';
import { CustomRequest } from '../../types';
import { makeAuthenticatedRequest, isAuthError, getAuthErrorMessage } from '../../services/authService';

export function TestConfiguration() {
  const { state, dispatch } = useBenchmark();
  const [openPanels, setOpenPanels] = useState<string[]>(['dotWalkingTests']);
  const [activeTab, setActiveTab] = useState('predefined');
  const [showRequestBuilder, setShowRequestBuilder] = useState(false);
  const [editingRequest, setEditingRequest] = useState<CustomRequest | undefined>();

  const togglePanel = (panelKey: string) => {
    setOpenPanels(prev => 
      prev.includes(panelKey) 
        ? prev.filter(key => key !== panelKey)
        : [...prev, panelKey]
    );
  };

  const testCategories = [
    { key: 'dotWalkingTests', title: '🚀 Dot-Walking Performance', description: 'Both APIs support dot-walking - see which performs better!' },
    { key: 'multiTableTests', title: '📊 Multi-Table Queries', description: 'GraphQL\'s biggest advantage - 1 query vs multiple REST calls' },
    { key: 'schemaTailoringTests', title: '📱 Schema Tailoring', description: 'Precise data fetching for mobile & performance scenarios' },
    { key: 'performanceScaleTests', title: '⚡ Performance at Scale', description: 'High-volume tests where differences become dramatic' },
    { key: 'realWorldScenarios', title: '🌟 Real-World Scenarios', description: 'Practical use cases developers encounter daily' },
  ];

  const enabledTests = testCategories.filter(category => 
    state.testConfiguration[category.key as keyof typeof state.testConfiguration].enabled
  );

  const handleRunTests = async () => {
    if (!state.instance.connected) {
      console.log('ServiceNow instance not connected');
      return;
    }

    dispatch({ type: 'SET_RUNNING', payload: true });
    dispatch({ type: 'RESET_TESTS' });

    // Helper to run multiple measurements for more accurate results
    async function measureApiCall(
      endpoint: string, 
      options: RequestInit, 
      iterations: number = 3
    ): Promise<{ responseTime: number; payloadSize: number; success: boolean; responseBody?: unknown; allResponseTimes: number[] }> {
      const times: number[] = [];
      let finalResponseBody: unknown;
      let finalPayloadSize = 0;
      let success = true;

      for (let i = 0; i < iterations; i++) {
        try {
          const start = performance.now();
          const response = await makeAuthenticatedRequest(endpoint, options, state.instance);
          const responseBody = await response.clone().json();
          const responseTime = performance.now() - start;
          
          times.push(responseTime);
          if (i === iterations - 1) { // Keep last response for data comparison
            finalResponseBody = responseBody;
            finalPayloadSize = JSON.stringify(responseBody).length;
          }
          
          // Small delay between measurements to reduce caching effects
          if (i < iterations - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (e) {
          success = false;
          times.push(0);
          
          // Log auth errors for debugging
          if (isAuthError(e)) {
            console.error('Authentication error:', getAuthErrorMessage(e));
          }
        }
      }

      // Use median time for more stable results (less affected by outliers)
      const sortedTimes = [...times].sort((a, b) => a - b);
      const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

      return {
        responseTime: medianTime,
        payloadSize: finalPayloadSize,
        success,
        responseBody: finalResponseBody,
        allResponseTimes: times // Return all individual response times
      };
    }

    // Helper to run multi-table tests (multiple REST calls vs single GraphQL query)
    async function runMultiTableTest({ testKey, label, scenario, limit }: {
      testKey: string;
      label: string;
      scenario: {
        restCalls: Array<{
          table: string;
          fields: string[];
          filter?: string;
        }>;
        name: string;
      };
      limit: number;
    }) {
      // Pre-flight validation with architectural monitoring
      const validation = validateMultiTableScenario(scenario);
      
      if (!validation.valid) {
        console.error('Multi-table scenario validation failed:', validation.errors);
        dispatch({
          type: 'UPDATE_TEST_STATUS',
          payload: {
            id: label,
            testType: label,
            status: 'failed',
            progress: 0,
            endTime: new Date(),
          },
        });
        return;
      }
      
      // Log performance warnings for architectural monitoring
      if (validation.warnings.length > 0) {
        console.warn(`Multi-table scenario warnings for ${scenario.name}:`, validation.warnings);
        console.info(`Query complexity score: ${validation.complexityScore}`);
      }
      
      dispatch({
        type: 'UPDATE_TEST_STATUS',
        payload: {
          id: label,
          testType: label,
          status: 'running',
          progress: 0,
          startTime: new Date(),
        },
      });

      // Execute multiple REST calls
      let totalRestTime = 0;
      let totalRestPayloadSize = 0;
      let restSuccess = true;
      const allRestResponseTimes: number[] = [];
      const allRestResponses: unknown[] = [];

      for (let i = 0; i < scenario.restCalls.length; i++) {
        const restCall = scenario.restCalls[i];
        const urlResult = buildRestUrl({ 
          table: restCall.table, 
          fields: restCall.fields, 
          limit,
          filter: restCall.filter
        });
        
        if (urlResult.errors.length > 0) {
          console.error('REST URL validation errors:', urlResult.errors);
          restSuccess = false;
          continue;
        }
        
        const restEndpoint = urlResult.url;
        const restOptions = {
          method: 'GET'
        };

        try {
          const restResult = await measureApiCall(restEndpoint, restOptions);
          totalRestTime += restResult.responseTime;
          totalRestPayloadSize += restResult.payloadSize;
          allRestResponseTimes.push(...restResult.allResponseTimes);
          allRestResponses.push(restResult.responseBody);
          
          if (!restResult.success) {
            restSuccess = false;
          }
        } catch (error) {
          console.error(`REST call ${i + 1} failed:`, error);
          restSuccess = false;
        }

        // Small delay between REST calls
        if (i < scenario.restCalls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Build GraphQL query using the new multi-table builder
      const gqlEndpoint = 'api/now/graphql';
      const gqlQueryResult = buildMultiTableGraphQLQuery({
        restCalls: scenario.restCalls,
        limit,
        orderBy: 'sys_id'
      });
      
      if (gqlQueryResult.errors.length > 0) {
        console.error('GraphQL query build errors:', gqlQueryResult.errors);
        dispatch({
          type: 'UPDATE_TEST_STATUS',
          payload: {
            id: label,
            testType: label,
            status: 'failed',
            progress: 0,
            endTime: new Date(),
          },
        });
        return;
      }

      const gqlOptions = {
        method: 'POST',
        body: JSON.stringify({ query: gqlQueryResult.query })
      };

      const gqlResult = await measureApiCall(gqlEndpoint, gqlOptions);

      // Compare performance: sum of all REST calls vs single GraphQL
      const winner = restSuccess && gqlResult.success
        ? (totalRestTime < gqlResult.responseTime ? 'rest' : 'graphql')
        : (restSuccess ? 'rest' : 'graphql');

      // Multi-table data comparison using specialized comparison function
      let dataComparison;
      if (restSuccess && gqlResult.success && allRestResponses.length > 0 && gqlResult.responseBody) {
        try {
          dataComparison = compareMultiTableApiResponses(
            allRestResponses,
            gqlResult.responseBody,
            scenario.restCalls
          );
        } catch (error) {
          console.error('Multi-table data comparison failed:', error);
          // Fallback to basic structure
          dataComparison = {
            isEquivalent: false,
            recordCountMatch: false,
            dataConsistency: 0,
            issues: ['Data comparison failed due to error'],
            restRecordCount: 0,
            graphqlRecordCount: 0,
            fieldMismatches: [],
          };
        }
      } else {
        // Fallback for failed API calls
        dataComparison = {
          isEquivalent: false,
          recordCountMatch: false,
          dataConsistency: 0,
          issues: ['Unable to compare data due to API failures'],
          restRecordCount: 0,
          graphqlRecordCount: 0,
          fieldMismatches: [],
        };
      }

      dispatch({
        type: 'ADD_TEST_RESULT',
        payload: {
          id: label,
          testType: label,
          restApi: {
            responseTime: totalRestTime,
            payloadSize: totalRestPayloadSize,
            requestCount: scenario.restCalls.length * 3, // Each REST call made 3 times
            success: restSuccess,
            allResponseTimes: allRestResponseTimes,
          },
          graphqlApi: {
            responseTime: gqlResult.responseTime,
            payloadSize: gqlResult.payloadSize,
            requestCount: 3, // GraphQL made 3 times
            success: gqlResult.success,
            allResponseTimes: gqlResult.allResponseTimes,
          },
          winner,
          timestamp: new Date(),
          dataComparison,
          restApiCall: {
            url: `${scenario.restCalls.length} REST calls to: ${scenario.restCalls.map(c => c.table).join(', ')}`,
            method: 'GET',
            responseTime: totalRestTime,
            payloadSize: totalRestPayloadSize,
            success: restSuccess,
            requestBody: undefined,
            responseBody: allRestResponses,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
          graphqlApiCall: {
            url: gqlEndpoint,
            method: 'POST',
            query: gqlQueryResult.query,
            responseTime: gqlResult.responseTime,
            payloadSize: gqlResult.payloadSize,
            success: gqlResult.success,
            variables: undefined,
            requestBody: gqlOptions.body,
            responseBody: gqlResult.responseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
        }
      });

      dispatch({
        type: 'UPDATE_TEST_STATUS',
        payload: {
          id: label,
          testType: label,
          status: 'completed',
          progress: 100,
          endTime: new Date(),
          dataComparison,
          restApiCall: {
            url: `${scenario.restCalls.length} REST calls to: ${scenario.restCalls.map(c => c.table).join(', ')}`,
            method: 'GET',
            responseTime: totalRestTime,
            payloadSize: totalRestPayloadSize,
            success: restSuccess,
            requestBody: undefined,
            responseBody: allRestResponses,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
          graphqlApiCall: {
            url: gqlEndpoint,
            method: 'POST',
            query: gqlQueryResult.query,
            responseTime: gqlResult.responseTime,
            payloadSize: gqlResult.payloadSize,
            success: gqlResult.success,
            variables: undefined,
            requestBody: gqlOptions.body,
            responseBody: gqlResult.responseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
        },
      });
    }

    // Helper to run a single REST and GraphQL test with randomized order
    async function runSingleTest({ testKey, testCase, restParams, gqlParams, label }: {
      testKey: string;
      testCase?: unknown;
      restParams: Record<string, unknown>;
      gqlParams: Record<string, unknown>;
      label: string;
    }) {
      dispatch({
        type: 'UPDATE_TEST_STATUS',
        payload: {
          id: `${testKey}-${label}`,
          testType: label,
          status: 'running',
          progress: 0,
          startTime: new Date(),
        },
      });

      // Prepare API call configurations
      const urlResult = buildRestUrl(restParams);
      
      if (urlResult.errors.length > 0) {
        console.error('REST URL validation errors:', urlResult.errors);
        dispatch({
          type: 'UPDATE_TEST_STATUS',
          payload: {
            id: `${testKey}-${label}`,
            testType: label,
            status: 'failed',
            progress: 0,
            endTime: new Date(),
          },
        });
        return;
      }
      
      const restEndpoint = urlResult.url;
      const restOptions = {
        method: 'GET'
      };

      const gqlEndpoint = 'api/now/graphql';
      const queryResult = buildGraphQLQuery(gqlParams);
      
      if (queryResult.errors.length > 0) {
        console.error('GraphQL query validation errors:', queryResult.errors);
        dispatch({
          type: 'UPDATE_TEST_STATUS',
          payload: {
            id: `${testKey}-${label}`,
            testType: label,
            status: 'failed',
            progress: 0,
            endTime: new Date(),
          },
        });
        return;
      }
      
      const gqlOptions = {
        method: 'POST',
        body: JSON.stringify({ query: queryResult.query })
      };

      // Randomize execution order to reduce bias
      const runRestFirst = Math.random() < 0.5;
      
      let restResult: Awaited<ReturnType<typeof measureApiCall>>;
      let gqlResult: Awaited<ReturnType<typeof measureApiCall>>;

      if (runRestFirst) {
        // REST first, then GraphQL
        restResult = await measureApiCall(restEndpoint, restOptions);
        // Small delay to reduce interference
        await new Promise(resolve => setTimeout(resolve, 200));
        gqlResult = await measureApiCall(gqlEndpoint, gqlOptions);
      } else {
        // GraphQL first, then REST
        gqlResult = await measureApiCall(gqlEndpoint, gqlOptions);
        // Small delay to reduce interference
        await new Promise(resolve => setTimeout(resolve, 200));
        restResult = await measureApiCall(restEndpoint, restOptions);
      }

      const restResponseTime = restResult.responseTime;
      const restPayloadSize = restResult.payloadSize;
      const restSuccess = restResult.success;
      const restResponseBody = restResult.responseBody;
      const restAllResponseTimes = restResult.allResponseTimes;

      const gqlResponseTime = gqlResult.responseTime;
      const gqlPayloadSize = gqlResult.payloadSize;
      const gqlSuccess = gqlResult.success;
      const gqlResponseBody = gqlResult.responseBody;
      const gqlAllResponseTimes = gqlResult.allResponseTimes;
      // Compare performance
      const winner = restSuccess && gqlSuccess
        ? (restResponseTime < gqlResponseTime ? 'rest' : 'graphql')
        : (restSuccess ? 'rest' : 'graphql');

      // Compare data equivalence
      let dataComparison;
      if (restSuccess && gqlSuccess && restResponseBody && gqlResponseBody) {
        // Extract field names from REST fields for comparison
        const expectedFields = Array.isArray(restParams.fields) 
          ? restParams.fields 
          : ['sys_id', 'number', 'short_description'];
        dataComparison = compareApiResponses(
          restResponseBody,
          gqlResponseBody,
          restParams.table as string,
          expectedFields as string[]
        );
      }

      dispatch({
        type: 'ADD_TEST_RESULT',
        payload: {
          id: `${testKey}-${label}`,
          testType: label,
          restApi: {
            responseTime: restResponseTime,
            payloadSize: restPayloadSize,
            requestCount: 3, // Updated to reflect actual number of API calls made
            success: restSuccess,
            allResponseTimes: restAllResponseTimes,
          },
          graphqlApi: {
            responseTime: gqlResponseTime,
            payloadSize: gqlPayloadSize,
            requestCount: 3, // Updated to reflect actual number of API calls made
            success: gqlSuccess,
            allResponseTimes: gqlAllResponseTimes,
          },
          winner,
          timestamp: new Date(),
          dataComparison,
          restApiCall: {
            endpoint: restEndpoint,
            method: 'GET',
            requestBody: undefined,
            responseBody: restResponseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
          graphqlApiCall: {
            endpoint: gqlEndpoint,
            query: queryResult.query,
            variables: gqlParams?.variables,
            requestBody: gqlOptions.body,
            responseBody: gqlResponseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
        }
      });
      dispatch({
        type: 'UPDATE_TEST_STATUS',
        payload: {
          id: `${testKey}-${label}`,
          testType: label,
          status: 'completed',
          progress: 100,
          endTime: new Date(),
          dataComparison,
          restApiCall: {
            url: restEndpoint,
            method: 'GET',
            responseTime: restResponseTime,
            payloadSize: restPayloadSize,
            success: restSuccess,
            requestBody: undefined,
            responseBody: restResponseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
          graphqlApiCall: {
            url: gqlEndpoint,
            method: 'POST',
            query: queryResult.query,
            responseTime: gqlResponseTime,
            payloadSize: gqlPayloadSize,
            success: gqlSuccess,
            variables: gqlParams?.variables,
            requestBody: gqlOptions.body,
            responseBody: gqlResponseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
        },
      });
    }

    // Loop through enabled tests and run all cases
    for (const test of enabledTests) {
      const key = test.key;
      const testConfig = state.testConfiguration[key as keyof typeof state.testConfiguration];
      if (key === 'dotWalkingTests') {
        const variants = testConfig.selectedVariants || Object.keys(testSpecs.dotWalkingTests);
        const limits = testConfig.selectedLimits || [25, 50, 100];
        
        for (const variant of variants) {
          const variantConfig = testSpecs.dotWalkingTests[variant as keyof typeof testSpecs.dotWalkingTests];
          if (variantConfig && variantConfig.tests) {
            for (const testCase of variantConfig.tests) {
              for (const limit of limits) {
                await runSingleTest({
                  testKey: key,
                  label: `${key}-${variant}-${testCase.name}-${limit}`,
                  restParams: { 
                    table: variantConfig.table, 
                    fields: testCase.restFields, 
                    limit 
                  },
                  gqlParams: { 
                    table: variantConfig.table, 
                    fields: testCase.graphqlFields, 
                    limit 
                  },
                });
              }
            }
          }
        }
      } else if (key === 'multiTableTests') {
        const variants = testConfig.selectedVariants || Object.keys(testSpecs.multiTableTests);
        const limits = testConfig.selectedLimits || [25, 50];
        
        for (const variant of variants) {
          const variantConfig = testSpecs.multiTableTests[variant as keyof typeof testSpecs.multiTableTests];
          if (variantConfig && variantConfig.scenarios) {
            for (const scenario of variantConfig.scenarios) {
              for (const limit of limits) {
                // For multi-table tests, execute ALL REST calls vs single GraphQL query
                if (scenario.restCalls && scenario.restCalls.length > 0) {
                  await runMultiTableTest({
                    testKey: key,
                    label: `${key}-${variant}-${scenario.name}-${limit}`,
                    scenario,
                    limit,
                  });
                }
              }
            }
          }
        }
      } else if (key === 'schemaTailoringTests') {
        const variants = testConfig.selectedVariants || Object.keys(testSpecs.schemaTailoringTests);
        const limits = testConfig.selectedLimits || [50, 100, 200];
        
        for (const variant of variants) {
          const variantConfig = testSpecs.schemaTailoringTests[variant as keyof typeof testSpecs.schemaTailoringTests];
          if (variantConfig && variantConfig.scenarios) {
            for (const scenario of variantConfig.scenarios) {
              for (const limit of limits) {
                // Check if this is a multi-table scenario with restCalls
                if (scenario.restCalls && scenario.restCalls.length > 0) {
                  await runMultiTableTest({
                    testKey: key,
                    label: `${key}-${variant}-${scenario.name}-${limit}`,
                    scenario,
                    limit,
                  });
                } else {
                  // Single table scenario - use scenario.table or fallback to variantConfig.table
                  const tableSource = scenario.table || variantConfig.table;
                  if (!tableSource) {
                    console.error(`No table specified for scenario ${scenario.name} in ${variant}`);
                    continue;
                  }
                  
                  await runSingleTest({
                    testKey: key,
                    label: `${key}-${variant}-${scenario.name}-${limit}`,
                    restParams: { 
                      table: tableSource, 
                      fields: scenario.restFields, 
                      limit 
                    },
                    gqlParams: { 
                      table: tableSource, 
                      fields: scenario.graphqlFields, 
                      limit 
                    },
                  });
                }
              }
            }
          }
        }
      } else if (key === 'performanceScaleTests') {
        const variants = testConfig.selectedVariants || Object.keys(testSpecs.performanceScaleTests);
        const limits = testConfig.selectedLimits || [500, 1000, 2500];
        
        for (const variant of variants) {
          const variantConfig = testSpecs.performanceScaleTests[variant as keyof typeof testSpecs.performanceScaleTests];
          if (variantConfig && variantConfig.scenarios) {
            for (const scenario of variantConfig.scenarios) {
              for (const limit of limits) {
                // Check if this is a multi-table scenario with restCalls
                if (scenario.restCalls && scenario.restCalls.length > 0) {
                  await runMultiTableTest({
                    testKey: key,
                    label: `${key}-${variant}-${scenario.name}-${limit}`,
                    scenario,
                    limit,
                  });
                } else {
                  // Single table scenario - use scenario.table or fallback to variantConfig.table
                  const tableSource = scenario.table || variantConfig.table;
                  if (!tableSource) {
                    console.error(`No table specified for scenario ${scenario.name} in ${variant}`);
                    continue;
                  }
                  
                  await runSingleTest({
                    testKey: key,
                    label: `${key}-${variant}-${scenario.name}-${limit}`,
                    restParams: { 
                      table: tableSource, 
                      fields: scenario.restFields, 
                      limit 
                    },
                    gqlParams: { 
                      table: tableSource, 
                      fields: scenario.graphqlFields, 
                      limit 
                    },
                  });
                }
              }
            }
          }
        }
      } else if (key === 'realWorldScenarios') {
        const variants = testConfig.selectedVariants || Object.keys(testSpecs.realWorldScenarios);
        
        for (const variant of variants) {
          const variantConfig = testSpecs.realWorldScenarios[variant as keyof typeof testSpecs.realWorldScenarios];
          if (variantConfig && variantConfig.scenarios) {
            for (const scenario of variantConfig.scenarios) {
              const limits = variantConfig.recordLimits || [1, 5];
              for (const limit of limits) {
                // Check if this is a multi-table scenario with restCalls
                if (scenario.restCalls && scenario.restCalls.length > 0) {
                  await runMultiTableTest({
                    testKey: key,
                    label: `${key}-${variant}-${scenario.name}-${limit}`,
                    scenario,
                    limit,
                  });
                } else {
                  // Single table scenario - use scenario.table or fallback to variantConfig.table
                  const tableSource = scenario.table || variantConfig.table;
                  if (!tableSource) {
                    console.error(`No table specified for scenario ${scenario.name} in ${variant}`);
                    continue;
                  }
                  
                  await runSingleTest({
                    testKey: key,
                    label: `${key}-${variant}-${scenario.name}-${limit}`,
                    restParams: { 
                      table: tableSource, 
                      fields: scenario.restFields, 
                      limit 
                    },
                    gqlParams: { 
                      table: tableSource, 
                      fields: scenario.graphqlFields, 
                      limit 
                    },
                  });
                }
              }
            }
          }
        }
      }
    }
    dispatch({ type: 'SET_RUNNING', payload: false });
  };

  // Custom request handlers
  const handleCreateCustomRequest = () => {
    setEditingRequest(undefined);
    setShowRequestBuilder(true);
  };

  const handleEditCustomRequest = (request: CustomRequest) => {
    setEditingRequest(request);
    setShowRequestBuilder(true);
  };

  const handleSaveCustomRequest = (request: CustomRequest) => {
    if (editingRequest) {
      dispatch({ type: 'UPDATE_CUSTOM_REQUEST', payload: request });
    } else {
      dispatch({ type: 'ADD_CUSTOM_REQUEST', payload: request });
    }
    setShowRequestBuilder(false);
    setEditingRequest(undefined);
  };

  const handleCancelRequestBuilder = () => {
    setShowRequestBuilder(false);
    setEditingRequest(undefined);
  };

  const handleRunCustomRequests = async () => {
    if (!state.instance.connected) {
      console.log('ServiceNow instance not connected');
      return;
    }

    const customRequests = state.customRequests.filter(req => req);
    if (customRequests.length === 0) {
      console.log('No custom requests to run');
      return;
    }

    dispatch({ type: 'SET_RUNNING', payload: true });

    for (const request of customRequests) {
      await runCustomRequestTest(request);
    }

    dispatch({ type: 'SET_RUNNING', payload: false });
  };

  const runCustomRequestTest = async (request: CustomRequest) => {
    const testId = `custom-${request.id}`;
    
    dispatch({
      type: 'UPDATE_TEST_STATUS',
      payload: {
        id: testId,
        testType: `Custom: ${request.name}`,
        status: 'running',
        progress: 0,
        startTime: new Date(),
      },
    });

    try {
      // Build REST URL
      const restResult = buildCustomRestUrl(request);
      if (restResult.errors.length > 0) {
        throw new Error(`REST URL validation errors: ${restResult.errors.map(e => e.message).join(', ')}`);
      }

      // Build GraphQL query
      const gqlResult = buildCustomGraphQLQuery(request);
      if (gqlResult.errors.length > 0) {
        throw new Error(`GraphQL query validation errors: ${gqlResult.errors.map(e => e.message).join(', ')}`);
      }

      const restEndpoint = restResult.url;
      const restOptions = {
        method: 'GET'
      };

      const gqlEndpoint = 'api/now/graphql';
      const gqlOptions = {
        method: 'POST',
        body: JSON.stringify({ query: gqlResult.query })
      };

      // Helper function for measuring API calls (reused from existing code)
      async function measureApiCall(
        url: string, 
        options: RequestInit, 
        iterations: number = 3,
        apiType: string = 'Unknown',
        baseProgress: number = 0
      ): Promise<{ responseTime: number; payloadSize: number; success: boolean; responseBody?: unknown; allResponseTimes: number[] }> {
        const times: number[] = [];
        let finalResponseBody: unknown;
        let finalPayloadSize = 0;
        let success = true;

        for (let i = 0; i < iterations; i++) {
          // Update progress before each iteration
          const iterationProgress = ((i + 1) / iterations) * 50; // Each API type gets 50% of progress
          const currentProgress = baseProgress + iterationProgress;
          const finalProgress = Math.min(currentProgress, 100);
          
          dispatch({
            type: 'UPDATE_TEST_STATUS',
            payload: {
              id: testId,
              testType: `Custom: ${request.name}`,
              status: 'running',
              progress: finalProgress,
              startTime: new Date(),
            },
          });
          
          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 200));
          try {
            const start = performance.now();
            const response = await makeAuthenticatedRequest(url, options, state.instance);
            const responseBody = await response.clone().json();
            const responseTime = performance.now() - start;
            
            times.push(responseTime);
            if (i === iterations - 1) {
              finalResponseBody = responseBody;
              finalPayloadSize = JSON.stringify(responseBody).length;
            }
            
            if (i < iterations - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (e) {
            success = false;
            times.push(0);
            
            // Log auth errors for debugging
            if (isAuthError(e)) {
              console.error('Authentication error:', getAuthErrorMessage(e));
            }
          }
        }

        const sortedTimes = [...times].sort((a, b) => a - b);
        const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

        return {
          responseTime: medianTime,
          payloadSize: finalPayloadSize,
          success,
          responseBody: finalResponseBody,
          allResponseTimes: times
        };
      }

      // Execute both API calls
      const runRestFirst = Math.random() < 0.5;
      let restCallResult: Awaited<ReturnType<typeof measureApiCall>>;
      let gqlCallResult: Awaited<ReturnType<typeof measureApiCall>>;

      if (runRestFirst) {
        restCallResult = await measureApiCall(restEndpoint, restOptions, 3, 'REST', 0);
        gqlCallResult = await measureApiCall(gqlEndpoint, gqlOptions, 3, 'GraphQL', 50);
      } else {
        gqlCallResult = await measureApiCall(gqlEndpoint, gqlOptions, 3, 'GraphQL', 0);
        restCallResult = await measureApiCall(restEndpoint, restOptions, 3, 'REST', 50);
      }

      // Compare performance
      const winner = restCallResult.success && gqlCallResult.success
        ? (restCallResult.responseTime < gqlCallResult.responseTime ? 'rest' : 'graphql')
        : (restCallResult.success ? 'rest' : 'graphql');

      // Compare data equivalence
      let dataComparison;
      if (restCallResult.success && gqlCallResult.success && restCallResult.responseBody && gqlCallResult.responseBody) {
        dataComparison = compareApiResponses(
          restCallResult.responseBody,
          gqlCallResult.responseBody,
          request.table,
          request.restConfig.fields
        );
      }

      dispatch({
        type: 'ADD_TEST_RESULT',
        payload: {
          id: testId,
          testType: `Custom: ${request.name}`,
          restApi: {
            responseTime: restCallResult.responseTime,
            payloadSize: restCallResult.payloadSize,
            requestCount: 3,
            success: restCallResult.success,
            allResponseTimes: restCallResult.allResponseTimes,
          },
          graphqlApi: {
            responseTime: gqlCallResult.responseTime,
            payloadSize: gqlCallResult.payloadSize,
            requestCount: 3,
            success: gqlCallResult.success,
            allResponseTimes: gqlCallResult.allResponseTimes,
          },
          winner,
          timestamp: new Date(),
          dataComparison,
        }
      });

      dispatch({
        type: 'UPDATE_TEST_STATUS',
        payload: {
          id: testId,
          testType: `Custom: ${request.name}`,
          status: 'completed',
          progress: 100,
          endTime: new Date(),
          restApiCall: {
            url: restEndpoint,
            method: 'GET',
            responseTime: restCallResult.responseTime,
            payloadSize: restCallResult.payloadSize,
            success: restCallResult.success,
            requestBody: undefined,
            responseBody: restCallResult.responseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
          graphqlApiCall: {
            url: gqlEndpoint,
            method: 'POST',
            query: gqlResult.query,
            responseTime: gqlCallResult.responseTime,
            payloadSize: gqlCallResult.payloadSize,
            success: gqlCallResult.success,
            variables: undefined,
            requestBody: gqlOptions.body,
            responseBody: gqlCallResult.responseBody,
            headers: { 'Authorization': '***', 'Content-Type': 'application/json' },
          },
          dataComparison,
        },
      });

    } catch (error) {
      dispatch({
        type: 'UPDATE_TEST_STATUS',
        payload: {
          id: testId,
          testType: `Custom: ${request.name}`,
          status: 'failed',
          progress: 0,
          endTime: new Date(),
        },
      });
      console.error(`Custom request test failed for ${request.name}:`, error);
    }
  };

  if (showRequestBuilder) {
    return (
      <Card className="p-6">
        <RequestBuilder
          request={editingRequest}
          onSave={handleSaveCustomRequest}
          onCancel={handleCancelRequestBuilder}
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold font-mono">Test Setup & Configuration</h2>
        <div className="flex space-x-2">
          <Button
            onClick={activeTab === 'predefined' ? handleRunTests : handleRunCustomRequests}
            disabled={state.isRunning || !state.instance.connected || (activeTab === 'predefined' ? enabledTests.length === 0 : state.customRequests.length === 0)}
            className="font-mono"
          >
            {state.isRunning ? 'Running Tests...' : (activeTab === 'predefined' ? 'Run Tests' : 'Run Custom Requests')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="predefined">Predefined Tests</TabsTrigger>
          <TabsTrigger value="custom">Custom Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="predefined" className="space-y-4">
          <div className="space-y-3">
            {testCategories.map((category) => (
              <TestCategoryPanel
                key={category.key}
                title={category.title}
                testKey={category.key}
                isOpen={openPanels.includes(category.key)}
                onToggle={() => togglePanel(category.key)}
                description={category.description}
              />
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <div className="text-sm font-mono text-gray-600">
              <div>Enabled Tests: {enabledTests.length}</div>
              <div>Instance Status: {state.instance.connected ? '✓ Connected' : '✗ Disconnected'}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <CustomRequestManager
            onEditRequest={handleEditCustomRequest}
            onCreateNew={handleCreateCustomRequest}
          />
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <div className="text-sm font-mono text-gray-600">
              <div>Custom Requests: {state.customRequests.length}</div>
              <div>Instance Status: {state.instance.connected ? '✓ Connected' : '✗ Disconnected'}</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
