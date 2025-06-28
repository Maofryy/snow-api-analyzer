
import React from 'react';
import { Card } from '@/components/ui/card';
import { useBenchmark } from '../../contexts/BenchmarkContext';

export function QuickStats() {
  const { state } = useBenchmark();
  const { testResults } = state;

  const calculateStats = () => {
    if (testResults.length === 0) {
      return {
        avgRestTime: 0,
        avgGraphqlTime: 0,
        totalRestPayload: 0,
        totalGraphqlPayload: 0,
        successRate: 0,
        improvement: 0,
      };
    }

    const avgRestTime = testResults.reduce((sum, r) => sum + r.restApi.responseTime, 0) / testResults.length;
    const avgGraphqlTime = testResults.reduce((sum, r) => sum + r.graphqlApi.responseTime, 0) / testResults.length;
    const totalRestPayload = testResults.reduce((sum, r) => sum + r.restApi.payloadSize, 0);
    const totalGraphqlPayload = testResults.reduce((sum, r) => sum + r.graphqlApi.payloadSize, 0);
    const successfulTests = testResults.filter(r => r.restApi.success && r.graphqlApi.success).length;
    const successRate = (successfulTests / testResults.length) * 100;
    
    const improvement = avgRestTime > 0 ? ((avgRestTime - avgGraphqlTime) / avgRestTime) * 100 : 0;

    return {
      avgRestTime,
      avgGraphqlTime,
      totalRestPayload,
      totalGraphqlPayload,
      successRate,
      improvement,
    };
  };

  const stats = calculateStats();

  const statCards = [
    {
      title: 'Avg Response Time',
      restValue: `${stats.avgRestTime.toFixed(0)}ms`,
      graphqlValue: `${stats.avgGraphqlTime.toFixed(0)}ms`,
      winner: stats.avgRestTime > stats.avgGraphqlTime ? 'graphql' : stats.avgRestTime < stats.avgGraphqlTime ? 'rest' : null,
    },
    {
      title: 'Total Payload Size',
      restValue: `${(stats.totalRestPayload / 1024).toFixed(1)}KB`,
      graphqlValue: `${(stats.totalGraphqlPayload / 1024).toFixed(1)}KB`,
      winner: stats.totalRestPayload > stats.totalGraphqlPayload ? 'graphql' : stats.totalRestPayload < stats.totalGraphqlPayload ? 'rest' : null,
    },
    {
      title: 'Success Rate',
      restValue: `${stats.successRate.toFixed(1)}%`,
      graphqlValue: `${stats.successRate.toFixed(1)}%`,
      winner: null,
    },
    {
      title: 'Performance Gain',
      restValue: stats.improvement > 0 ? `+${stats.improvement.toFixed(1)}%` : `${stats.improvement.toFixed(1)}%`,
      graphqlValue: stats.improvement < 0 ? `+${Math.abs(stats.improvement).toFixed(1)}%` : `${(-stats.improvement).toFixed(1)}%`,
      winner: stats.improvement > 0 ? 'graphql' : stats.improvement < 0 ? 'rest' : null,
    },
  ];

  return (
    <div className="space-y-3">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-4">
          <h4 className="font-mono text-sm font-medium text-gray-700 mb-3">
            {stat.title}
          </h4>
          
          <div className="space-y-2">
            <div className={`flex justify-between items-center p-2 rounded ${
              stat.winner === 'rest' ? 'winner-highlight' : 'bg-gray-50'
            }`}>
              <span className="font-mono text-xs text-gray-600">REST</span>
              <span className="font-mono text-sm font-medium">
                {stat.restValue}
              </span>
              {stat.winner === 'rest' && <span className="text-success">✓</span>}
            </div>
            
            <div className={`flex justify-between items-center p-2 rounded ${
              stat.winner === 'graphql' ? 'winner-highlight' : 'bg-gray-50'
            }`}>
              <span className="font-mono text-xs text-gray-600">GraphQL</span>
              <span className="font-mono text-sm font-medium">
                {stat.graphqlValue}
              </span>
              {stat.winner === 'graphql' && <span className="text-success">✓</span>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
