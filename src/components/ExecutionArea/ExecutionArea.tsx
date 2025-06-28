
import React from 'react';
import { LiveProgress } from './LiveProgress';
import { TestConsole } from './TestConsole';

export function ExecutionArea() {
  return (
    <div className="space-y-6">
      <LiveProgress />
      <TestConsole />
    </div>
  );
}
