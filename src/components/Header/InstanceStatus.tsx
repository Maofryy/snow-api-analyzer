
import React from 'react';
import { useBenchmark } from '../../contexts/BenchmarkContext';

export function InstanceStatus() {
  const { state } = useBenchmark();
  const { instance } = state;

  return (
    <div className="flex items-center space-x-4 font-mono">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Instance:</span>
        <code className="bg-code-bg px-2 py-1 rounded text-sm border">
          {instance.url || 'Not configured'}
        </code>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Status:</span>
        <div className="flex items-center space-x-1">
          <div className={`status-dot ${instance.connected ? 'status-connected' : 'status-disconnected'}`}></div>
          <span className={`text-sm ${instance.connected ? 'text-success' : 'text-error'}`}>
            {instance.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
