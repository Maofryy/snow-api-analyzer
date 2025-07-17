
import React from 'react';
import { LiveProgress } from './LiveProgress';
import { LiveConsole } from './LiveConsole';

export function ExecutionArea() {
  return (
    <div className="space-y-6">
      <LiveProgress />
      <LiveConsole />
    </div>
  );
}
