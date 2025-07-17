
import React from 'react';
import { Card } from '@/components/ui/card';
import { useBenchmark } from '../../contexts/BenchmarkContext';

export function LiveScore() {
  const { state } = useBenchmark();
  const { testResults } = state;

  const restWins = testResults.filter(r => r.winner === 'rest').length;
  const graphqlWins = testResults.filter(r => r.winner === 'graphql').length;
  const totalTests = testResults.length;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold font-mono mb-4 text-center">Performance Scoreboard</h3>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold font-mono mb-2">
            <span className="text-info">{restWins}</span>
            <span className="text-gray-400 mx-3">:</span>
            <span className="text-success">{graphqlWins}</span>
          </div>
          <div className="text-sm font-mono text-gray-600">
            REST vs GraphQL
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm">REST API</span>
            <div className="flex items-center space-x-2">
              <div className="w-12 text-right font-mono text-sm font-bold text-info">
                {restWins}
              </div>
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-info h-2 rounded-full transition-all duration-300"
                  style={{ width: totalTests > 0 ? `${(restWins / totalTests) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm">GraphQL</span>
            <div className="flex items-center space-x-2">
              <div className="w-12 text-right font-mono text-sm font-bold text-success">
                {graphqlWins}
              </div>
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-success h-2 rounded-full transition-all duration-300"
                  style={{ width: totalTests > 0 ? `${(graphqlWins / totalTests) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 text-center">
          <div className="font-mono text-sm text-gray-600">
            Total Tests: {totalTests}
          </div>
        </div>
      </div>
    </Card>
  );
}
