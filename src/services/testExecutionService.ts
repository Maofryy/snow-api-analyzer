import { testSpecs } from '../specs/testSpecs';
import { buildRestUrl, buildGraphQLQuery, buildMultiTableGraphQLQuery, validateMultiTableScenario } from '../utils/apiBuilders';
import { compareApiResponses, compareMultiTableApiResponses } from '../utils/dataComparison';
import { makeAuthenticatedRequest, isAuthError, getAuthErrorMessage } from '../services/authService';
import { ServiceNowInstance, TestConfiguration } from '../types';

export interface TestExecutionResult {
  success: boolean;
  error?: string;
}

export class TestExecutionService {
  static async executeTests(
    instance: ServiceNowInstance,
    testConfiguration: TestConfiguration,
    dispatch: React.Dispatch<{ type: string; payload?: any }>
  ): Promise<TestExecutionResult> {
    if (!instance.connected) {
      console.log('ServiceNow instance not connected');
      return { success: false, error: 'Instance not connected' };
    }

    dispatch({ type: 'SET_RUNNING', payload: true });
    dispatch({ type: 'RESET_TESTS' });

    try {
      // Helper to run multiple measurements for more accurate results
      async function measureApiCall(
        endpoint: string, 
        options: RequestInit, 
        iterations: number = 3,
        testId?: string,
        testDisplayName?: string,
        isRestCall?: boolean,
        baseProgress?: number
      ): Promise<{ responseTime: number; payloadSize: number; success: boolean; responseBody?: unknown; allResponseTimes: number[] }> {
        const times: number[] = [];
        let finalResponseBody: unknown;
        let finalPayloadSize = 0;
        let success = true;

        for (let i = 0; i < iterations; i++) {
          // Update progress before starting each iteration
          if (testId && testDisplayName) {
            const iterationProgress = ((i + 1) / iterations) * 50; // Each API type gets 50% of progress
            const currentProgress = (baseProgress || 0) + iterationProgress;
            const finalProgress = Math.min(currentProgress, 100);
            
            dispatch({
              type: 'UPDATE_TEST_STATUS',
              payload: {
                id: testId,
                testType: testDisplayName,
                status: 'running',
                progress: finalProgress,
                startTime: testStartTime,
              },
            });
            
            // Allow UI to update before starting the API call
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          try {
            const start = performance.now();
            const response = await makeAuthenticatedRequest(endpoint, options, instance);
            const responseBody = await response.clone().json();
            const responseTime = performance.now() - start;
            
            times.push(responseTime);
            if (i === iterations - 1) { // Keep last response for data comparison
              finalResponseBody = responseBody;
              finalPayloadSize = JSON.stringify(responseBody).length;
              console.log('🔍 measureApiCall - Final iteration payload size:', finalPayloadSize, 'for', testId);
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

        console.log('🔍 measureApiCall result:', {
          responseTime: medianTime,
          payloadSize: finalPayloadSize,
          success,
          allResponseTimes: times
        });

        return {
          responseTime: medianTime,
          payloadSize: finalPayloadSize,
          success,
          responseBody: finalResponseBody,
          allResponseTimes: times
        };
      }

      const testCategories = [
        { key: 'dotWalkingTests', title: '🚀 Dot-Walking Performance' },
        { key: 'multiTableTests', title: '📊 Multi-Table Queries' },
        { key: 'schemaTailoringTests', title: '📱 Schema Tailoring' },
        { key: 'performanceScaleTests', title: '⚡ Performance at Scale' },
        { key: 'realWorldScenarios', title: '🌟 Real-World Scenarios' },
      ];

      const enabledTests = testCategories.filter(category => 
        testConfiguration[category.key as keyof typeof testConfiguration].enabled
      );

      let totalTests = 0;
      let restWins = 0;
      let graphqlWins = 0;
      let totalRestResponseTime = 0;
      let totalGraphqlResponseTime = 0;
      let totalRestPayloadSize = 0;
      let totalGraphqlPayloadSize = 0;

      // Process each enabled test category
      for (const category of enabledTests) {
        const categorySpecs = testSpecs[category.key as keyof typeof testSpecs];
        const categoryConfig = testConfiguration[category.key as keyof typeof testConfiguration];

        if (!categorySpecs || !categoryConfig.enabled) continue;

        // Get variants and limits to test
        const variants = categoryConfig.selectedVariants || Object.keys(categorySpecs);
        const limits = categoryConfig.selectedLimits || [categoryConfig.parameters.recordLimit];

        // Process each variant
        for (const variant of variants) {
          const variantSpec = categorySpecs[variant];
          if (!variantSpec) continue;

          // Process each limit
          for (const limit of limits) {
            const testId = `${category.key}-${variant}-${limit}`;
            const testDisplayName = `${category.title} - ${variant} (${limit} records)`;

            const testStartTime = new Date().toISOString();
            
            // Update test status
            dispatch({
              type: 'UPDATE_TEST_STATUS',
              payload: {
                id: testId,
                testType: testDisplayName,
                status: 'running',
                progress: 0,
                startTime: testStartTime,
              },
            });

            try {
              // Handle multi-table tests differently
              if (category.key === 'multiTableTests' && variantSpec.restCalls) {
                // Multi-table test execution logic
                const validation = validateMultiTableScenario(variantSpec);
                if (!validation.isValid) {
                  throw new Error(validation.error);
                }

                // Execute REST calls (multiple calls)
                dispatch({
                  type: 'UPDATE_TEST_STATUS',
                  payload: {
                    id: testId,
                    testType: testDisplayName,
                    status: 'running',
                    progress: 5,
                    startTime: new Date().toISOString(),
                  },
                });
                
                const restStartTime = performance.now();
                const restResponses = [];
                
                for (let i = 0; i < variantSpec.restCalls.length; i++) {
                  const call = variantSpec.restCalls[i];
                  const restUrl = buildRestUrl(call.table, call.fields, call.filter || '', limit);
                  const restOptions = { method: 'GET', headers: { 'Accept': 'application/json' } };
                  
                  const restResult = await measureApiCall(
                    restUrl, 
                    restOptions, 
                    1, 
                    testId, 
                    testDisplayName, 
                    true, 
                    (i / variantSpec.restCalls.length) * 50
                  );
                  restResponses.push(restResult);
                }

                // Calculate total REST time and payload size
                const restTotalTime = restResponses.reduce((sum, r) => sum + r.responseTime, 0);
                const restTotalPayload = restResponses.reduce((sum, r) => sum + r.payloadSize, 0);
                const restSuccess = restResponses.every(r => r.success);

                // Execute GraphQL call (single call)
                dispatch({
                  type: 'UPDATE_TEST_STATUS',
                  payload: {
                    id: testId,
                    testType: testDisplayName,
                    status: 'running',
                    progress: 55,
                    startTime: new Date().toISOString(),
                  },
                });
                
                const graphqlQuery = buildMultiTableGraphQLQuery(variantSpec, limit);
                const graphqlUrl = `${instance.url}/api/now/graphql`;
                const graphqlOptions = {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: graphqlQuery })
                };

                const graphqlResult = await measureApiCall(graphqlUrl, graphqlOptions, 1, testId, testDisplayName, false, 50);

                // Compare responses
                const comparison = compareMultiTableApiResponses(
                  restResponses.map(r => r.responseBody),
                  graphqlResult.responseBody,
                  variantSpec
                );

                // Determine winner
                const restWon = restSuccess && (restTotalTime < graphqlResult.responseTime);
                const graphqlWon = graphqlResult.success && (graphqlResult.responseTime < restTotalTime);

                if (restWon) restWins++;
                if (graphqlWon) graphqlWins++;

                // Update totals
                totalTests++;
                totalRestResponseTime += restTotalTime;
                totalGraphqlResponseTime += graphqlResult.responseTime;
                totalRestPayloadSize += restTotalPayload;
                totalGraphqlPayloadSize += graphqlResult.payloadSize;

                // Add test result
                dispatch({
                  type: 'ADD_TEST_RESULT',
                  payload: {
                    id: testId,
                    testType: testDisplayName,
                    restApi: {
                      responseTime: restTotalTime,
                      payloadSize: restTotalPayload,
                      requestCount: restResponses.length,
                      success: restSuccess,
                      allResponseTimes: restResponses.map(r => r.responseTime)
                    },
                    graphqlApi: {
                      responseTime: graphqlResult.responseTime,
                      payloadSize: graphqlResult.payloadSize,
                      requestCount: 1,
                      success: graphqlResult.success,
                      allResponseTimes: graphqlResult.allResponseTimes
                    },
                    winner: restWon ? 'rest' : graphqlWon ? 'graphql' : 'tie',
                    timestamp: new Date(),
                    dataComparison: comparison
                  }
                });

                // Final update
                dispatch({
                  type: 'UPDATE_TEST_STATUS',
                  payload: {
                    id: testId,
                    testType: testDisplayName,
                    status: 'completed',
                    progress: 100,
                    startTime: new Date().toISOString(),
                    endTime: new Date().toISOString(),
                    dataComparison: comparison,
                    restApiCall: {
                      url: 'Multiple REST calls',
                      method: 'GET',
                      responseTime: restTotalTime,
                      payloadSize: restTotalPayload,
                      success: restSuccess,
                      responseBody: restResponses.map(r => r.responseBody)
                    },
                    graphqlApiCall: {
                      url: graphqlUrl,
                      method: 'POST',
                      query: graphqlQuery,
                      responseTime: graphqlResult.responseTime,
                      payloadSize: graphqlResult.payloadSize,
                      success: graphqlResult.success,
                      responseBody: graphqlResult.responseBody
                    }
                  },
                });
              } else {
                // Single table test execution logic
                
                // Start REST calls
                dispatch({
                  type: 'UPDATE_TEST_STATUS',
                  payload: {
                    id: testId,
                    testType: testDisplayName,
                    status: 'running',
                    progress: 5,
                    startTime: new Date().toISOString(),
                  },
                });
                
                const restUrl = buildRestUrl(variantSpec.table, variantSpec.fields, variantSpec.filter || '', limit);
                const restOptions = { method: 'GET', headers: { 'Accept': 'application/json' } };
                
                const restResult = await measureApiCall(restUrl, restOptions, 3, testId, testDisplayName, true, 0);

                // Start GraphQL calls
                dispatch({
                  type: 'UPDATE_TEST_STATUS',
                  payload: {
                    id: testId,
                    testType: testDisplayName,
                    status: 'running',
                    progress: 55,
                    startTime: new Date().toISOString(),
                  },
                });

                const graphqlQuery = buildGraphQLQuery(variantSpec.table, variantSpec.fields, variantSpec.filter || '', limit);
                const graphqlUrl = `${instance.url}/api/now/graphql`;
                const graphqlOptions = {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: graphqlQuery })
                };

                const graphqlResult = await measureApiCall(graphqlUrl, graphqlOptions, 3, testId, testDisplayName, false, 50);

                // Compare responses
                const comparison = compareApiResponses(
                  restResult.responseBody,
                  graphqlResult.responseBody,
                  variantSpec.fields
                );

                // Determine winner
                const restWon = restResult.success && (restResult.responseTime < graphqlResult.responseTime);
                const graphqlWon = graphqlResult.success && (graphqlResult.responseTime < restResult.responseTime);

                if (restWon) restWins++;
                if (graphqlWon) graphqlWins++;

                // Update totals
                totalTests++;
                totalRestResponseTime += restResult.responseTime;
                totalGraphqlResponseTime += graphqlResult.responseTime;
                totalRestPayloadSize += restResult.payloadSize;
                totalGraphqlPayloadSize += graphqlResult.payloadSize;

                // Add test result
                dispatch({
                  type: 'ADD_TEST_RESULT',
                  payload: {
                    id: testId,
                    testType: testDisplayName,
                    restApi: {
                      responseTime: restResult.responseTime,
                      payloadSize: restResult.payloadSize,
                      requestCount: 1,
                      success: restResult.success,
                      allResponseTimes: restResult.allResponseTimes
                    },
                    graphqlApi: {
                      responseTime: graphqlResult.responseTime,
                      payloadSize: graphqlResult.payloadSize,
                      requestCount: 1,
                      success: graphqlResult.success,
                      allResponseTimes: graphqlResult.allResponseTimes
                    },
                    winner: restWon ? 'rest' : graphqlWon ? 'graphql' : 'tie',
                    timestamp: new Date(),
                    dataComparison: comparison
                  }
                });

                // Final update
                const testEndTime = new Date().toISOString();
                const finalPayload = {
                  id: testId,
                  testType: testDisplayName,
                  status: 'completed',
                  progress: 100,
                  startTime: testStartTime,
                  endTime: testEndTime,
                  dataComparison: comparison,
                  restApiCall: {
                    url: restUrl,
                    method: 'GET',
                    responseTime: restResult.responseTime,
                    payloadSize: restResult.payloadSize,
                    success: restResult.success,
                    responseBody: restResult.responseBody
                  },
                  graphqlApiCall: {
                    url: graphqlUrl,
                    method: 'POST',
                    query: graphqlQuery,
                    responseTime: graphqlResult.responseTime,
                    payloadSize: graphqlResult.payloadSize,
                    success: graphqlResult.success,
                    responseBody: graphqlResult.responseBody
                  }
                };

                console.log('🔍 TestExecutionService - Final update payload:', finalPayload);
                console.log('🔍 Response times - REST:', restResult.responseTime, 'GraphQL:', graphqlResult.responseTime);
                console.log('🔍 Payload sizes - REST:', restResult.payloadSize, 'GraphQL:', graphqlResult.payloadSize);
                console.log('🔍 Complete restApiCall object:', finalPayload.restApiCall);
                console.log('🔍 Complete graphqlApiCall object:', finalPayload.graphqlApiCall);
                
                dispatch({
                  type: 'UPDATE_TEST_STATUS',
                  payload: finalPayload,
                });
              }
            } catch (error) {
              // Handle test failure
              dispatch({
                type: 'UPDATE_TEST_STATUS',
                payload: {
                  id: testId,
                  testType: testDisplayName,
                  status: 'failed',
                  progress: 0,
                  startTime: new Date().toISOString(),
                  endTime: new Date().toISOString(),
                  error: error instanceof Error ? error.message : 'Unknown error'
                },
              });
            }
          }
        }
      }

      // Update final metrics
      dispatch({
        type: 'UPDATE_METRICS',
        payload: {
          restWins,
          graphqlWins,
          totalTests,
          averageRestResponseTime: totalTests > 0 ? totalRestResponseTime / totalTests : 0,
          averageGraphqlResponseTime: totalTests > 0 ? totalGraphqlResponseTime / totalTests : 0,
          totalRestPayloadSize,
          totalGraphqlPayloadSize,
          successRate: totalTests > 0 ? ((restWins + graphqlWins) / totalTests) * 100 : 0,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Test execution error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      dispatch({ type: 'SET_RUNNING', payload: false });
    }
  }
}