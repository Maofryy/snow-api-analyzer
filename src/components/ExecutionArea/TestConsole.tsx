
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
        logs.push(`[${status.startTime.toLocaleTimeString()}] Starting ${status.testType}...`);
      }
      
      if (status.status === 'running') {
        logs.push(`[${new Date().toLocaleTimeString()}] ${status.testType} - Progress: ${Math.round(status.progress)}%`);
      }
      
      if (status.status === 'completed') {
        const result = testResults.find(r => r.id === status.id);
        if (result) {
          logs.push(`[${new Date().toLocaleTimeString()}] ${status.testType} - Completed`);
          logs.push(`  └─ REST: ${result.restApi.responseTime.toFixed(2)}ms, ${(result.restApi.payloadSize / 1024).toFixed(2)}KB`);
          logs.push(`  └─ GraphQL: ${result.graphqlApi.responseTime.toFixed(2)}ms, ${(result.graphqlApi.payloadSize / 1024).toFixed(2)}KB`);
          logs.push(`  └─ Winner: ${result.winner.toUpperCase()}`);
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
        className="test-console"
        style={{ minHeight: '200px', maxHeight: '300px' }}
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
