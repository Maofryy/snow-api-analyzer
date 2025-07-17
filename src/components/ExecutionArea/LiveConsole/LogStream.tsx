import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LogEntry as LogEntryType, LogFilters, LogGroup } from './types';
import { LogEntry } from './LogEntry';

interface LogStreamProps {
  logs: LogEntryType[];
  filters: LogFilters;
  selectedEntry: LogEntryType | null;
  onEntrySelect: (entry: LogEntryType) => void;
  autoScroll: boolean;
  onViewDetails?: (entry: LogEntryType) => void;
}

export const LogStream: React.FC<LogStreamProps> = ({
  logs,
  filters,
  selectedEntry,
  onEntrySelect,
  autoScroll,
  onViewDetails
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [logGroups, setLogGroups] = useState<LogGroup[]>([]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Test type filter
      if (filters.testTypes.length > 0 && log.testType) {
        const matchesTestType = filters.testTypes.some(testType => 
          log.testType?.toLowerCase().includes(testType.toLowerCase()) ||
          testType.toLowerCase().includes(log.testType?.toLowerCase() || '')
        );
        if (!matchesTestType) return false;
      }

      // Log level filter
      if (filters.logLevels.length > 0 && !filters.logLevels.includes(log.level)) {
        return false;
      }

      // API type filter
      if (filters.apiTypes.length > 0 && filters.apiTypes.length < 3) {
        if (log.metadata?.apiCall) {
          const apiType = log.metadata.apiCall.type;
          if (!filters.apiTypes.includes(apiType) && !filters.apiTypes.includes('both')) {
            return false;
          }
        }
      }

      // Data consistency filter
      if (filters.dataConsistency !== 'all' && log.metadata?.dataComparison) {
        const { isEquivalent, onlyKnownIssues } = log.metadata.dataComparison;
        if (filters.dataConsistency === 'perfect-only' && !isEquivalent) {
          return false;
        }
        if (filters.dataConsistency === 'issues-only' && isEquivalent) {
          return false;
        }
      }

      // Search query filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          log.message,
          log.testType,
          log.category,
          log.level,
          log.metadata?.apiCall?.endpoint,
          log.metadata?.apiCall?.query
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filters]);

  // Group logs by test
  useEffect(() => {
    const groups: { [key: string]: LogGroup } = {};
    
    filteredLogs.forEach(log => {
      if (!log.testId) return;
      
      if (!groups[log.testId]) {
        groups[log.testId] = {
          id: log.testId,
          testType: log.testType || 'Unknown Test',
          testId: log.testId,
          entries: [],
          startTime: log.timestamp,
          status: 'running',
          isExpanded: true
        };
      }
      
      groups[log.testId].entries.push(log);
      
      // Update group status and end time
      if (log.timestamp > groups[log.testId].startTime) {
        groups[log.testId].startTime = log.timestamp;
      }
      
      if (log.level === 'success' && log.category === 'performance') {
        groups[log.testId].status = 'completed';
        groups[log.testId].endTime = log.timestamp;
      } else if (log.level === 'error') {
        groups[log.testId].status = 'failed';
        groups[log.testId].endTime = log.timestamp;
      }
    });
    
    setLogGroups(Object.values(groups).sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    ));
  }, [filteredLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [filteredLogs, autoScroll]);

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const toggleGroupExpanded = (groupId: string) => {
    setLogGroups(prev => 
      prev.map(group => 
        group.id === groupId 
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    );
  };

  if (filteredLogs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-sm">
        <div className="text-center">
          <p>No logs match current filters</p>
          <p className="text-xs mt-1">
            {logs.length > 0 ? `${logs.length} total logs available` : 'Run tests to see execution logs'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-auto p-4 space-y-1"
      style={{ maxHeight: '400px' }}
    >
      {logGroups.length > 0 ? (
        // Grouped view
        logGroups.map(group => (
          <div key={group.id} className="mb-4">
            <div 
              className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => toggleGroupExpanded(group.id)}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  group.status === 'completed' ? 'bg-green-500' :
                  group.status === 'failed' ? 'bg-red-500' :
                  'bg-blue-500 animate-pulse'
                }`} />
                <span className="font-mono text-sm font-medium">{group.testType}</span>
                <span className="text-xs text-gray-500">
                  {group.entries.length} entries
                </span>
              </div>
              
              <div className="flex-1" />
              
              <div className="text-xs text-gray-500 font-mono">
                {group.startTime.toLocaleTimeString()}
                {group.endTime && ` - ${group.endTime.toLocaleTimeString()}`}
              </div>
            </div>
            
            {group.isExpanded && (
              <div className="mt-2 space-y-1">
                {group.entries.map(entry => (
                  <LogEntry
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    onSelect={() => onEntrySelect(entry)}
                    onToggleExpand={() => toggleExpanded(entry.id)}
                    expanded={expandedEntries.has(entry.id)}
                    onViewDetails={() => onViewDetails?.(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        // Flat view
        filteredLogs.map(entry => (
          <LogEntry
            key={entry.id}
            entry={entry}
            isSelected={selectedEntry?.id === entry.id}
            onSelect={() => onEntrySelect(entry)}
            onToggleExpand={() => toggleExpanded(entry.id)}
            expanded={expandedEntries.has(entry.id)}
            onViewDetails={() => onViewDetails?.(entry)}
          />
        ))
      )}
    </div>
  );
};