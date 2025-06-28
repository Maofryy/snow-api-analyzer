
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useBenchmark } from '../../contexts/BenchmarkContext';

export function LiveProgress() {
  const { state } = useBenchmark();
  const { testStatuses, isRunning } = state;

  if (!isRunning && testStatuses.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500 font-mono">
          <p>No tests running</p>
          <p className="text-sm mt-2">Configure and run tests to see live progress</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold font-mono mb-4">Live Test Progress</h3>
      
      <div className="space-y-4">
        {testStatuses.map((status) => (
          <div key={status.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`status-dot ${
                  status.status === 'running' ? 'status-running' :
                  status.status === 'completed' ? 'status-connected' :
                  status.status === 'failed' ? 'status-disconnected' :
                  'status-pending'
                }`}></div>
                <span className="font-mono text-sm font-medium">{status.testType}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-gray-500 uppercase">
                  {status.status}
                </span>
                {status.status === 'running' && (
                  <span className="font-mono text-xs text-info">
                    {Math.round(status.progress)}%
                  </span>
                )}
              </div>
            </div>
            
            <Progress 
              value={status.progress} 
              className="h-2"
            />
            
            {status.startTime && (
              <div className="text-xs font-mono text-gray-500">
                Started: {status.startTime.toLocaleTimeString()}
                {status.endTime && (
                  <span className="ml-4">
                    Duration: {Math.round((status.endTime.getTime() - status.startTime.getTime()) / 1000)}s
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
