
import React from 'react';
import { InstanceStatus } from './InstanceStatus';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">
            ServiceNow API Benchmark Tool
          </h1>
          <p className="text-sm text-gray-600 font-mono mt-1">
            REST vs GraphQL Performance Analysis
          </p>
        </div>
        
        <InstanceStatus />
      </div>
    </header>
  );
}
