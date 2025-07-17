import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Database, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Award
} from 'lucide-react';
import { PerformanceSnapshot, LogEntry } from './types';
import { DataComparisonResult } from '../../../types';

interface MetricsInlineProps {
  performance?: PerformanceSnapshot;
  dataComparison?: DataComparisonResult;
  compact?: boolean;
  showAnimation?: boolean;
}

export const MetricsInline: React.FC<MetricsInlineProps> = ({
  performance,
  dataComparison,
  compact = false,
  showAnimation = false
}) => {
  if (!performance && !dataComparison) return null;

  const formatTime = (ms: number) => ms.toFixed(1);
  const formatSize = (bytes: number) => (bytes / 1024).toFixed(1);

  const getWinnerColor = (winner: string) => {
    switch (winner) {
      case 'rest': return 'text-blue-500';
      case 'graphql': return 'text-green-500';
      case 'tie': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getDataConsistencyColor = (consistency: number, isEquivalent: boolean, onlyKnownIssues?: boolean) => {
    if (isEquivalent) return 'text-green-500';
    if (onlyKnownIssues) return 'text-yellow-500';
    if (consistency >= 80) return 'text-orange-500';
    return 'text-red-500';
  };

  const getDataConsistencyIcon = (isEquivalent: boolean, onlyKnownIssues?: boolean) => {
    if (isEquivalent) return <CheckCircle className="w-3 h-3" />;
    if (onlyKnownIssues) return <AlertTriangle className="w-3 h-3" />;
    return <XCircle className="w-3 h-3" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono">
        {performance && (
          <>
            <Badge variant="outline" className="text-xs">
              <Award className="w-3 h-3 mr-1" />
              {performance.winner.toUpperCase()}
            </Badge>
            <span className="text-gray-400">
              {formatTime(performance.restTime)}ms vs {formatTime(performance.graphqlTime)}ms
            </span>
          </>
        )}
        {dataComparison && (
          <Badge 
            variant={dataComparison.isEquivalent ? "default" : dataComparison.onlyKnownIssues ? "secondary" : "destructive"}
            className="text-xs"
          >
            {dataComparison.isEquivalent ? "✓" : dataComparison.onlyKnownIssues ? "⚠" : "✗"} {dataComparison.dataConsistency}%
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {performance && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Performance Results</span>
            <Badge 
              variant="outline" 
              className={`${getWinnerColor(performance.winner)} ${showAnimation ? 'animate-pulse' : ''}`}
            >
              <Award className="w-3 h-3 mr-1" />
              {performance.winner.toUpperCase()} WINS
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-3 h-3" />
                <span>Response Time</span>
              </div>
              <div className="font-mono">
                <div className="flex justify-between">
                  <span>REST:</span>
                  <span className={performance.winner === 'rest' ? 'text-blue-600 font-bold' : ''}>
                    {formatTime(performance.restTime)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GraphQL:</span>
                  <span className={performance.winner === 'graphql' ? 'text-green-600 font-bold' : ''}>
                    {formatTime(performance.graphqlTime)}ms
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-gray-600">
                <Database className="w-3 h-3" />
                <span>Payload Size</span>
              </div>
              <div className="font-mono">
                <div className="flex justify-between">
                  <span>REST:</span>
                  <span>{formatSize(performance.restPayload)}KB</span>
                </div>
                <div className="flex justify-between">
                  <span>GraphQL:</span>
                  <span>{formatSize(performance.graphqlPayload)}KB</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Zap className="w-3 h-3" />
            <span>
              REST: {performance.requestCount.rest} requests, 
              GraphQL: {performance.requestCount.graphql} requests
            </span>
          </div>
        </div>
      )}
      
      {dataComparison && (
        <div className={`space-y-2 ${performance ? 'mt-3 pt-3 border-t border-gray-200' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Data Consistency</span>
            <div className={`flex items-center gap-1 ${getDataConsistencyColor(dataComparison.dataConsistency, dataComparison.isEquivalent, dataComparison.onlyKnownIssues)}`}>
              {getDataConsistencyIcon(dataComparison.isEquivalent, dataComparison.onlyKnownIssues)}
              <span className="text-sm font-mono">{dataComparison.dataConsistency}%</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Consistency Score</span>
              <span>{dataComparison.dataConsistency}%</span>
            </div>
            <Progress 
              value={dataComparison.dataConsistency} 
              className="h-2"
              // @ts-expect-error - CSS custom properties not typed
              style={{
                '--progress-background': dataComparison.isEquivalent ? '#10b981' : 
                                      dataComparison.onlyKnownIssues ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Records: {dataComparison.restRecordCount} REST, {dataComparison.graphqlRecordCount} GraphQL</span>
            {dataComparison.issues.length > 0 && (
              <span className="text-red-500">{dataComparison.issues.length} issues</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};