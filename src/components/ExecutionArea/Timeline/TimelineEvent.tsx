import React from 'react';
import { TimelineEvent as TimelineEventType } from './types';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Bug, 
  Zap, 
  Clock,
  Activity,
  Database,
  Globe
} from 'lucide-react';

interface TimelineEventProps {
  event: TimelineEventType;
  isFirst?: boolean;
  isLast?: boolean;
  showTimestamp?: boolean;
}

const getEventIcon = (type: TimelineEventType['type'], level: TimelineEventType['level']) => {
  switch (type) {
    case 'test_start':
      return <Activity className="w-4 h-4 text-blue-600" />;
    case 'test_complete':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'test_failed':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'api_call':
      return <Globe className="w-4 h-4 text-purple-600" />;
    case 'test_progress':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-500" />;
    case 'debug':
      return <Bug className="w-4 h-4 text-gray-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Info className="w-4 h-4 text-gray-500" />;
  }
};

const getLevelColor = (level: TimelineEventType['level']) => {
  switch (level) {
    case 'success':
      return 'text-green-700 bg-green-50';
    case 'error':
      return 'text-red-700 bg-red-50';
    case 'warning':
      return 'text-yellow-700 bg-yellow-50';
    case 'debug':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-blue-700 bg-blue-50';
  }
};

export const TimelineEvent: React.FC<TimelineEventProps> = ({ 
  event, 
  isFirst, 
  isLast, 
  showTimestamp = true 
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="flex items-start space-x-3 group">
      {/* Timeline Line */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-gray-200 rounded-full group-hover:border-blue-300 transition-colors">
          {getEventIcon(event.type, event.level)}
        </div>
        {!isLast && (
          <div className="w-0.5 h-6 bg-gray-200 mt-2"></div>
        )}
      </div>

      {/* Event Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center space-x-2 mb-1">
          {showTimestamp && (
            <span className="text-xs text-gray-500 font-mono">
              {formatTime(event.timestamp)}
            </span>
          )}
          <Badge variant="outline" className={`text-xs ${getLevelColor(event.level)}`}>
            {event.level.toUpperCase()}
          </Badge>
          {event.metadata?.apiType && (
            <Badge variant="secondary" className="text-xs">
              {event.metadata.apiType.toUpperCase()}
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-900 mb-2">{event.message}</p>

        {/* Event Metadata */}
        {event.metadata && (
          <div className="space-y-1">
            {event.metadata.responseTime && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Zap className="w-3 h-3" />
                <span>Response Time: {event.metadata.responseTime}ms</span>
              </div>
            )}
            
            {event.metadata.payloadSize && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Database className="w-3 h-3" />
                <span>Payload Size: {(event.metadata.payloadSize / 1024).toFixed(1)}KB</span>
              </div>
            )}

            {event.metadata.iteration && event.metadata.totalIterations && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Activity className="w-3 h-3" />
                <span>Iteration {event.metadata.iteration} of {event.metadata.totalIterations}</span>
              </div>
            )}

            {event.metadata.progress !== undefined && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${event.metadata.progress}%` }}
                  />
                </div>
                <span>{event.metadata.progress}%</span>
              </div>
            )}

            {event.metadata.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                {event.metadata.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};