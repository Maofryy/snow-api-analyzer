
import React from 'react';
import { LiveScore } from './LiveScore';
import { QuickStats } from './QuickStats';

export function Scoreboard() {
  return (
    <div className="space-y-6">
      <LiveScore />
      <QuickStats />
    </div>
  );
}
