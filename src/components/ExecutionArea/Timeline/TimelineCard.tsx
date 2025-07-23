import React, { useState } from 'react';
import { TimelineTest } from './types';
import { TimelineEvent } from './TimelineEvent';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Zap, 
  Database, 
  Trophy,
  PlayCircle,
  CheckCircle,
  XCircle,
  PauseCircle,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

interface TimelineCardProps {
  test: TimelineTest;
  onViewDetails?: (testId: string) => void;
  onRunTest?: (testId: string) => void;
  isExpanded?: boolean;
  onToggleExpanded?: (testId: string) => void;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  test,
  onViewDetails,
  onRunTest,
  isExpanded = false,
  onToggleExpanded
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  
  console.log('🔍 TimelineCard - test data:', test.id, {
    summary: test.summary,
    status: test.status,
    events: test.events.length,
    restResponseTime: test.summary?.restResponseTime,
    graphqlResponseTime: test.summary?.graphqlResponseTime,
    restPayloadSize: test.summary?.restPayloadSize,
    graphqlPayloadSize: test.summary?.graphqlPayloadSize
  });

  const handleToggle = () => {
    const newExpanded = !localExpanded;
    setLocalExpanded(newExpanded);
    onToggleExpanded?.(test.id);
  };

  const getStatusIcon = (status: TimelineTest['status']) => {
    // Special handling for completed tests with data consistency issues
    if (status === 'completed' && test.summary?.dataConsistency === 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
    
    switch (status) {
      case 'running':
        return <PlayCircle className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <PauseCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TimelineTest['status']) => {
    // Special handling for completed tests with data consistency issues
    if (status === 'completed' && test.summary?.dataConsistency === 0) {
      return 'border-yellow-200 bg-yellow-50';
    }
    
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return 'Not started';
    if (!end && test.status === 'running') {
      const elapsed = (Date.now() - start.getTime()) / 1000;
      return `${elapsed.toFixed(1)}s elapsed`;
    }
    if (!end) return 'In progress';
    
    const duration = (end.getTime() - start.getTime()) / 1000;
    return `${duration.toFixed(1)}s total`;
  };

  const getWinnerInfo = () => {
    if (!test.summary?.winner) return null;
    
    const { winner, restResponseTime, graphqlResponseTime } = test.summary;
    const difference = restResponseTime && graphqlResponseTime 
      ? Math.abs(restResponseTime - graphqlResponseTime)
      : 0;
    
    return {
      winner,
      difference,
      restTime: restResponseTime || 0,
      graphqlTime: graphqlResponseTime || 0
    };
  };

  const winnerInfo = getWinnerInfo();

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${getStatusColor(test.status)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(test.status)}
            <div>
              <h3 className="font-semibold text-gray-900">{test.name}</h3>
              <p className="text-sm text-gray-600">
                {formatDuration(test.startTime, test.endTime)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={
              test.status === 'completed' && test.summary?.dataConsistency === 0 ? 'destructive' :
              test.status === 'completed' ? 'default' : 'secondary'
            }>
              {test.status === 'completed' && test.summary?.dataConsistency === 0 
                ? 'DATA MISMATCH' 
                : test.status.toUpperCase()}
            </Badge>
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(test.id)}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Details
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <Progress value={test.progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{test.progress}% complete</span>
            <span>{test.events.length} events</span>
          </div>
        </div>

        {/* Summary Stats */}
        {test.summary && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">REST:</span>
                <span className="font-mono">{test.summary.restResponseTime ? test.summary.restResponseTime.toFixed(2) : '0.00'}ms</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600">GraphQL:</span>
                <span className="font-mono">{test.summary.graphqlResponseTime ? test.summary.graphqlResponseTime.toFixed(2) : '0.00'}ms</span>
              </div>
            </div>
            <div className="space-y-2">
              {winnerInfo && (
                <div className="flex items-center space-x-2 text-sm">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                  <span className="text-gray-600">Winner:</span>
                  <span className="font-semibold text-gray-900">
                    {winnerInfo.winner.toUpperCase()}
                  </span>
                </div>
              )}
              {test.summary.dataConsistency !== undefined && (
                <div className="flex items-center space-x-2 text-sm">
                  <Database className={`w-4 h-4 ${
                    test.summary.dataConsistency === 0 ? 'text-red-600' : 
                    test.summary.dataConsistency < 50 ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                  <span className="text-gray-600">Data Match:</span>
                  <span className={`font-mono ${
                    test.summary.dataConsistency === 0 ? 'text-red-600 font-semibold' : 
                    test.summary.dataConsistency < 50 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {test.summary.dataConsistency}%
                    {test.summary.dataConsistency === 0 && (
                      <span className="text-xs text-red-600 ml-1">(APIs return different data)</span>
                    )}
                  </span>
                </div>
              )}
              {(test.summary.restPayloadSize || test.summary.graphqlPayloadSize) && (
                <div className="flex items-center space-x-2 text-sm">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Payload:</span>
                  <span className="font-mono">
                    {test.summary.restPayloadSize ? `${(test.summary.restPayloadSize / 1024).toFixed(1)}KB` : '0KB'} / {test.summary.graphqlPayloadSize ? `${(test.summary.graphqlPayloadSize / 1024).toFixed(1)}KB` : '0KB'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      {/* Collapsible Event Timeline */}
      <Collapsible open={localExpanded} onOpenChange={handleToggle}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between px-4 py-2 border-t"
          >
            <span className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Execution Timeline ({test.events.length} events)</span>
            </span>
            {localExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-4">
            {test.events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No events yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {test.events.map((event, index) => (
                  <TimelineEvent
                    key={event.id}
                    event={event}
                    isFirst={index === 0}
                    isLast={index === test.events.length - 1}
                    showTimestamp={true}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};