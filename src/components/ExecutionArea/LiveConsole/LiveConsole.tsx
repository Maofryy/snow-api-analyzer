import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useBenchmark } from '../../../contexts/BenchmarkContext';
import { ConsoleHeader } from './ConsoleHeader';
import { LogStream } from './LogStream';
import { ConsoleFooter } from './ConsoleFooter';
import { LogDetailsPanel } from './LogDetailsPanel';
import { ApiCallDetailsModal } from '../ApiCallDetailsModal';
import { LogEntry, LogFilters, PerformanceSnapshot } from './types';
import { TestStatus, TestResult } from '../../../types';
import { Copy, ExternalLink, Download } from 'lucide-react';

interface LiveConsoleProps {
  className?: string;
  maxHeight?: string;
  defaultFilters?: Partial<LogFilters>;
  onExport?: (logs: LogEntry[]) => void;
}

const DEFAULT_FILTERS: LogFilters = {
  testTypes: [],
  logLevels: ['info', 'success', 'warning', 'error'],
  apiTypes: ['rest', 'graphql', 'both'],
  dataConsistency: 'all',
  searchQuery: ''
};

export const LiveConsole: React.FC<LiveConsoleProps> = ({
  className = "",
  maxHeight = "500px",
  defaultFilters = {},
  onExport
}) => {
  const { state } = useBenchmark();
  const { testStatuses, testResults, isRunning, instance } = state;
  
  const [filters, setFilters] = useState<LogFilters>({ ...DEFAULT_FILTERS, ...defaultFilters });
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [selectedTestStatus, setSelectedTestStatus] = useState<TestStatus | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Generate logs from test statuses and results
  const generateLogs = useCallback(() => {
    const newLogs: LogEntry[] = [];
    const processedTests = new Set<string>();

    // Process test statuses
    testStatuses.forEach((status) => {
      const testKey = `${status.id}-${status.status}`;
      if (processedTests.has(testKey)) return;
      processedTests.add(testKey);

      // Test start log
      if (status.startTime && status.status !== 'pending') {
        newLogs.push({
          id: `${status.id}-start`,
          timestamp: status.startTime,
          level: 'info',
          category: 'test',
          message: `Starting ${status.testType}...`,
          testId: status.id,
          testType: status.testType,
          metadata: {
            testStatus: status
          }
        });
      }

      // Test progress log (only for running tests)
      if (status.status === 'running') {
        newLogs.push({
          id: `${status.id}-progress`,
          timestamp: new Date(),
          level: 'info',
          category: 'test',
          message: `${status.testType} - Progress: ${Math.round(status.progress)}%`,
          testId: status.id,
          testType: status.testType,
          metadata: {
            testStatus: status
          }
        });
      }

      // Test completion log
      if (status.status === 'completed' && status.endTime) {
        const result = testResults.find(r => r.id === status.id);
        let performance: PerformanceSnapshot | undefined;
        
        if (result) {
          performance = {
            restTime: result.restApi.responseTime,
            graphqlTime: result.graphqlApi.responseTime,
            restPayload: result.restApi.payloadSize,
            graphqlPayload: result.graphqlApi.payloadSize,
            winner: result.winner,
            requestCount: {
              rest: result.restApi.requestCount,
              graphql: result.graphqlApi.requestCount
            }
          };
        }

        newLogs.push({
          id: `${status.id}-completed`,
          timestamp: status.endTime,
          level: 'success',
          category: 'performance',
          message: `${status.testType} completed successfully`,
          testId: status.id,
          testType: status.testType,
          metadata: {
            testStatus: status,
            testResult: result,
            performance,
            dataComparison: status.dataComparison
          },
          actions: [
            {
              id: 'copy-results',
              label: 'Copy Results',
              icon: Copy,
              onClick: () => handleCopyResults(result)
            },
            {
              id: 'view-details',
              label: 'View Details',
              icon: ExternalLink,
              onClick: () => handleViewDetails(status)
            }
          ]
        });

        // Add performance breakdown if available
        if (performance) {
          const isMultiTable = result && result.restApi.requestCount > result.graphqlApi.requestCount;
          
          if (isMultiTable) {
            const numRestCalls = result.restApi.requestCount / 3;
            newLogs.push({
              id: `${status.id}-perf-breakdown`,
              timestamp: status.endTime,
              level: 'info',
              category: 'performance',
              message: `Performance: REST ${numRestCalls} calls (${performance.restTime.toFixed(2)}ms) vs GraphQL 1 query (${performance.graphqlTime.toFixed(2)}ms) - ${performance.winner.toUpperCase()} wins`,
              testId: status.id,
              testType: status.testType,
              metadata: {
                performance,
                dataComparison: status.dataComparison
              }
            });
          } else {
            newLogs.push({
              id: `${status.id}-perf-breakdown`,
              timestamp: status.endTime,
              level: 'info',
              category: 'performance',
              message: `Performance: REST ${performance.restTime.toFixed(2)}ms vs GraphQL ${performance.graphqlTime.toFixed(2)}ms - ${performance.winner.toUpperCase()} wins`,
              testId: status.id,
              testType: status.testType,
              metadata: {
                performance,
                dataComparison: status.dataComparison
              }
            });
          }
        }

        // Add data consistency log if available
        if (status.dataComparison) {
          const consistency = status.dataComparison;
          const level = consistency.isEquivalent ? 'success' : 
                       consistency.onlyKnownIssues ? 'warning' : 'error';
          
          newLogs.push({
            id: `${status.id}-data-consistency`,
            timestamp: status.endTime,
            level,
            category: 'data',
            message: `Data consistency: ${consistency.dataConsistency}% (${consistency.restRecordCount} REST, ${consistency.graphqlRecordCount} GraphQL records)`,
            testId: status.id,
            testType: status.testType,
            metadata: {
              dataComparison: consistency
            }
          });
        }
      }

      // Test failure log
      if (status.status === 'failed' && status.endTime) {
        newLogs.push({
          id: `${status.id}-failed`,
          timestamp: status.endTime,
          level: 'error',
          category: 'test',
          message: `${status.testType} failed`,
          testId: status.id,
          testType: status.testType,
          metadata: {
            testStatus: status
          }
        });
      }
    });

    // Sort logs by timestamp
    newLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return newLogs;
  }, [testStatuses, testResults]);

  const handleCopyResults = (result?: TestResult) => {
    if (!result) return;
    
    const resultText = `${result.testType} Results:
REST: ${result.restApi.responseTime.toFixed(2)}ms, ${(result.restApi.payloadSize / 1024).toFixed(2)}KB
GraphQL: ${result.graphqlApi.responseTime.toFixed(2)}ms, ${(result.graphqlApi.payloadSize / 1024).toFixed(2)}KB
Winner: ${result.winner.toUpperCase()}`;
    
    navigator.clipboard.writeText(resultText);
  };

  const handleViewDetails = (status: TestStatus) => {
    setSelectedTestStatus(status);
    setApiModalOpen(true);
  };

  const handleExport = useCallback(() => {
    const exportData = {
      logs,
      filters,
      exportedAt: new Date().toISOString(),
      totalLogs: logs.length,
      instance: {
        url: instance.url,
        connected: instance.connected
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onExport) {
      onExport(logs);
    }
  }, [logs, filters, instance.url, instance.connected, onExport]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
    setSelectedEntry(null);
  }, []);

  // Update logs when test statuses or results change
  useEffect(() => {
    const newLogs = generateLogs();
    setLogs(newLogs);
  }, [generateLogs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f': {
            e.preventDefault();
            // Focus search input
            const searchInput = document.querySelector('input[placeholder="Search logs..."]') as HTMLInputElement;
            searchInput?.focus();
            break;
          }
          case 'e': {
            e.preventDefault();
            handleExport();
            break;
          }
          case 'k': {
            e.preventDefault();
            handleClearLogs();
            break;
          }
        }
      }
      
      if (e.key === 'Escape') {
        setSelectedEntry(null);
        setDetailsPanelOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleExport, handleClearLogs]);

  const handleViewEntryDetails = (entry: LogEntry) => {
    setSelectedEntry(entry);
    setDetailsPanelOpen(true);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Apply filters similar to LogStream
      if (filters.testTypes.length > 0 && log.testType) {
        const matchesTestType = filters.testTypes.some(testType => 
          log.testType?.toLowerCase().includes(testType.toLowerCase()) ||
          testType.toLowerCase().includes(log.testType?.toLowerCase() || '')
        );
        if (!matchesTestType) return false;
      }

      if (filters.logLevels.length > 0 && !filters.logLevels.includes(log.level)) {
        return false;
      }

      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          log.message,
          log.testType,
          log.category,
          log.level
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filters]);

  return (
    <div className={`flex flex-col ${className}`} style={{ height: maxHeight }}>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ConsoleHeader
          filters={filters}
          onFiltersChange={setFilters}
          logCount={logs.length}
          filteredCount={filteredLogs.length}
          onClearLogs={handleClearLogs}
          onExport={handleExport}
          onShowHelp={() => setShowHelp(true)}
        />
        
        <LogStream
          logs={filteredLogs}
          filters={filters}
          selectedEntry={selectedEntry}
          onEntrySelect={setSelectedEntry}
          autoScroll={autoScroll}
          onViewDetails={handleViewEntryDetails}
        />
        
        <ConsoleFooter
          autoScroll={autoScroll}
          onAutoScrollToggle={setAutoScroll}
          logCount={logs.length}
          filteredCount={filteredLogs.length}
          onExport={handleExport}
          onShowHelp={() => setShowHelp(true)}
          isConnected={instance.connected}
          isRunning={isRunning}
        />
      </Card>

      <LogDetailsPanel
        entry={selectedEntry}
        open={detailsPanelOpen}
        onClose={() => setDetailsPanelOpen(false)}
        position="modal"
      />

      <ApiCallDetailsModal
        open={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        restApiCall={selectedTestStatus?.restApiCall}
        graphqlApiCall={selectedTestStatus?.graphqlApiCall}
        dataComparison={selectedTestStatus?.dataComparison}
      />
    </div>
  );
};