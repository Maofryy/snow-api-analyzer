
import React from 'react';
import { LiveProgress } from './LiveProgress';
import { LiveConsole } from './LiveConsole';

export function ExecutionArea() {
  return (
    <div className="space-y-4">
      <LiveProgress />
      <LiveConsole maxHeight="450px" />
    </div>
  );
}
