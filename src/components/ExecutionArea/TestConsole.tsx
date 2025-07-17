
import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { useBenchmark } from '../../contexts/BenchmarkContext';

export function TestConsole() {
  const { state } = useBenchmark();
  const { testStatuses, testResults } = state;
  const consoleRef = useRef<HTMLDivElement>(null);

  const generateLogEntries = () => {
    const logs: string[] = [];
    
    testStatuses.forEach((status) => {
      if (status.startTime) {
        logs.push(`[${new Date(status.startTime).toLocaleTimeString()}] Starting ${status.testType}...`);
      }
      
      if (status.status === 'running') {
        logs.push(`[${new Date().toLocaleTimeString()}] ${status.testType} - Progress: ${Math.round(status.progress)}%`);
      }
      
      if (status.status === 'completed') {
        const result = testResults.find(r => r.id === status.id);
        if (result) {
          logs.push(`[${new Date().toLocaleTimeString()}] ${status.testType} - Completed`);
          
          // Check if this is a multi-table test (REST made more calls than GraphQL)
          const isMultiTableTest = result.restApi.requestCount > result.graphqlApi.requestCount;
          
          if (isMultiTableTest) {
            // Multi-table test: show aggregated REST calls vs single GraphQL
            const numRestCalls = result.restApi.requestCount / 3; // Divide by 3 since each call was made 3 times
            logs.push(`  └─ REST: ${numRestCalls} API calls → total: ${result.restApi.responseTime.toFixed(2)}ms, ${(result.restApi.payloadSize / 1024).toFixed(2)}KB`);
            
            if (result.graphqlApi.allResponseTimes && result.graphqlApi.allResponseTimes.length > 0) {
              const gqlTimes = result.graphqlApi.allResponseTimes.map(t => `${t.toFixed(1)}ms`).join(', ');
              logs.push(`  └─ GraphQL: 1 query [${gqlTimes}] → median: ${result.graphqlApi.responseTime.toFixed(2)}ms, ${(result.graphqlApi.payloadSize / 1024).toFixed(2)}KB`);
            } else {
              logs.push(`  └─ GraphQL: 1 query → ${result.graphqlApi.responseTime.toFixed(2)}ms, ${(result.graphqlApi.payloadSize / 1024).toFixed(2)}KB`);
            }
          } else {
            // Single table test: show individual response times
            if (result.restApi.allResponseTimes && result.restApi.allResponseTimes.length > 0) {
              const restTimes = result.restApi.allResponseTimes.map(t => `${t.toFixed(1)}ms`).join(', ');
              logs.push(`  └─ REST: [${restTimes}] → median: ${result.restApi.responseTime.toFixed(2)}ms, ${(result.restApi.payloadSize / 1024).toFixed(2)}KB`);
            } else {
              logs.push(`  └─ REST: ${result.restApi.responseTime.toFixed(2)}ms, ${(result.restApi.payloadSize / 1024).toFixed(2)}KB`);
            }
            
            // Display individual GraphQL response times
            if (result.graphqlApi.allResponseTimes && result.graphqlApi.allResponseTimes.length > 0) {
              const gqlTimes = result.graphqlApi.allResponseTimes.map(t => `${t.toFixed(1)}ms`).join(', ');
              logs.push(`  └─ GraphQL: [${gqlTimes}] → median: ${result.graphqlApi.responseTime.toFixed(2)}ms, ${(result.graphqlApi.payloadSize / 1024).toFixed(2)}KB`);
            } else {
              logs.push(`  └─ GraphQL: ${result.graphqlApi.responseTime.toFixed(2)}ms, ${(result.graphqlApi.payloadSize / 1024).toFixed(2)}KB`);
            }
          }
          
          logs.push(`  └─ Winner: ${result.winner.toUpperCase()}`);
          
          // Add data comparison info if available
          if (result.dataComparison) {
            const consistency = result.dataComparison.dataConsistency;
            const equivalent = result.dataComparison.isEquivalent ? '✓' : 
                              result.dataComparison.onlyKnownIssues ? '⚠' : '✗';
            logs.push(`  └─ Data Consistency: ${equivalent} ${consistency}%`);
          }
        }
      }
      
      if (status.status === 'failed') {
        logs.push(`[${new Date().toLocaleTimeString()}] ${status.testType} - FAILED`);
      }
    });

    return logs;
  };

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [testStatuses, testResults]);

  const logs = generateLogEntries();

  return (
    <Card className="p-0 overflow-hidden">
      <div className="bg-gray-800 text-gray-200 p-3 border-b">
        <h3 className="font-mono text-sm font-medium">Test Console</h3>
      </div>
      
      <div 
        ref={consoleRef}
        className="test-console overflow-y-auto bg-gray-900 text-green-400 p-4 font-mono text-sm"
        style={{ minHeight: '300px', maxHeight: '400px' }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">
            Console ready. Run tests to see execution logs...
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
