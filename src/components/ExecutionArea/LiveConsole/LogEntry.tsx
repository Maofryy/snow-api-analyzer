import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  ExternalLink,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  Database,
  Code
} from 'lucide-react';
import { LogEntry as LogEntryType, LogEntryAction } from './types';
import { MetricsInline } from './MetricsInline';

interface LogEntryProps {
  entry: LogEntryType;
  isSelected: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  expanded: boolean;
  onViewDetails?: () => void;
}

export const LogEntry: React.FC<LogEntryProps> = ({
  entry,
  isSelected,
  onSelect,
  onToggleExpand,
  expanded,
  onViewDetails
}) => {
  const [copied, setCopied] = useState(false);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'border-l-blue-500 bg-blue-50';
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return <Zap className="w-3 h-3" />;
      case 'data': return <Database className="w-3 h-3" />;
      case 'api': return <Code className="w-3 h-3" />;
      case 'system': return <Info className="w-3 h-3" />;
      default: return <Info className="w-3 h-3" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hasExpandableContent = entry.metadata?.performance || 
                              entry.metadata?.dataComparison || 
                              entry.metadata?.apiCall;

  return (
    <div 
      className={`
        border-l-4 p-3 mb-2 rounded-r-lg transition-all duration-200 cursor-pointer
        ${getLevelColor(entry.level)}
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        hover:shadow-md
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {hasExpandableContent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="mt-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          
          <div className="flex items-center gap-2 mt-1">
            {getLevelIcon(entry.level)}
            <Badge variant="outline" className="text-xs">
              {getCategoryIcon(entry.category)}
              <span className="ml-1">{entry.category}</span>
            </Badge>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-gray-600" title={entry.timestamp.toLocaleString()}>
                {formatTime(entry.timestamp)}
              </span>
              <span className="text-xs text-gray-400">
                {formatRelativeTime(entry.timestamp)}
              </span>
              {entry.testType && (
                <Badge variant="secondary" className="text-xs">
                  {entry.testType}
                </Badge>
              )}
            </div>
            
            <div className="text-sm text-gray-800 font-mono">
              {entry.message}
            </div>
            
            {entry.metadata?.performance && (
              <MetricsInline 
                performance={entry.metadata.performance}
                dataComparison={entry.metadata.dataComparison}
                compact={!expanded}
                showAnimation={entry.level === 'success'}
              />
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-3">
          {entry.actions?.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <action.icon className="w-3 h-3" />
            </Button>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(entry.message);
            }}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
          >
            {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </Button>
          
          {(entry.metadata?.testStatus?.restApiCall || entry.metadata?.testStatus?.graphqlApiCall) && onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {expanded && hasExpandableContent && (
        <div className="mt-3 pl-9">
          {entry.metadata?.performance && (
            <MetricsInline 
              performance={entry.metadata.performance}
              dataComparison={entry.metadata.dataComparison}
              compact={false}
              showAnimation={false}
            />
          )}
          
          {entry.metadata?.apiCall && (
            <div className="mt-3 p-2 bg-gray-100 rounded text-xs font-mono">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {entry.metadata.apiCall.type.toUpperCase()}
                </Badge>
                <span className="text-gray-600">{entry.metadata.apiCall.method || 'POST'}</span>
              </div>
              <div className="text-gray-800 break-all">
                {entry.metadata.apiCall.endpoint}
              </div>
              {entry.metadata.apiCall.query && (
                <div className="mt-1 text-gray-600">
                  Query: {entry.metadata.apiCall.query.slice(0, 100)}...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};