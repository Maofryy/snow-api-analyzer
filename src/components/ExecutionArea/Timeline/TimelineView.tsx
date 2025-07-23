import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimelineTest, TimelineEvent, TimelineFilters as TimelineFiltersType } from './types';
import { TimelineCard } from './TimelineCard';
import { TimelineFilters } from './TimelineFilters';
import { ApiCallDetailsModal } from '../ApiCallDetailsModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBenchmark } from '../../../contexts/BenchmarkContext';
import { TestStatus } from '../../../types';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Share, 
  Settings,
  ChevronUp,
  Activity,
  Trophy,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface TimelineViewProps {
  className?: string;
  onExport?: (data: any) => void;
  onTestSelect?: (testId: string) => void;
  autoScroll?: boolean;
  maxHeight?: string;
  showCompletionModal?: boolean;
  onShowCompletionModal?: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  className = '',
  onExport,
  onTestSelect,
  autoScroll = true,
  maxHeight = '70vh',
  showCompletionModal = false,
  onShowCompletionModal,
  isExpanded = false,
  onToggleExpanded
}) => {
  const { state, dispatch } = useBenchmark();
  const { testStatuses, isRunning, testResults, performanceMetrics } = state;
  const [filters, setFilters] = useState<TimelineFiltersType>({});
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Convert test statuses to timeline tests
  const timelineTests: TimelineTest[] = useMemo(() => {
    console.log('🔍 TimelineView - testStatuses:', testStatuses);
    console.log('🔍 TimelineView - testResults:', testResults);
    console.log('🔍 TimelineView - Complete testStatuses object:', JSON.stringify(testStatuses, null, 2));
    return testStatuses.map(status => {
      const events: TimelineEvent[] = [];
      
      // Helper function to extract metrics from potentially different data structures
      const extractMetrics = (apiCall: any, apiType: 'rest' | 'graphql') => {
        console.log(`🔍 Extracting metrics for ${apiType}:`, apiCall);
        
        if (!apiCall) {
          console.log(`🔍 No ${apiType} API call found`);
          return { responseTime: undefined, payloadSize: undefined };
        }
        
        // Check standard structure first
        if (apiCall.responseTime !== undefined && apiCall.payloadSize !== undefined) {
          console.log(`🔍 Found standard structure for ${apiType}:`, {
            responseTime: apiCall.responseTime,
            payloadSize: apiCall.payloadSize
          });
          return {
            responseTime: Math.round(apiCall.responseTime * 1000) / 1000, // Round to 3 decimal places
            payloadSize: apiCall.payloadSize
          };
        }
        
        // Calculate payload size from responseBody if available
        let payloadSize = 0;
        if (apiCall.responseBody && typeof apiCall.responseBody === 'object') {
          payloadSize = JSON.stringify(apiCall.responseBody).length;
          console.log(`🔍 Calculated payload size for ${apiType}:`, payloadSize);
        }
        
        // Try to find response time in testResults for this test
        const matchingResult = testResults.find(result => result.id === status.id);
        if (matchingResult) {
          const responseTime = apiType === 'rest' 
            ? matchingResult.restApi?.responseTime 
            : matchingResult.graphqlApi?.responseTime;
          
          console.log(`🔍 Found ${apiType} response time in testResults:`, responseTime);
          
          if (responseTime !== undefined) {
            return {
              responseTime: Math.round(responseTime * 1000) / 1000, // Round to 3 decimal places
              payloadSize: payloadSize || (apiType === 'rest' ? matchingResult.restApi?.payloadSize : matchingResult.graphqlApi?.payloadSize) || 0
            };
          }
        }
        
        // If no responseTime found anywhere, return calculated values
        console.log(`🔍 No response time found for ${apiType}, using defaults`);
        return { 
          responseTime: undefined, 
          payloadSize: payloadSize || 0 
        };
      };
      
      const restMetrics = extractMetrics(status.restApiCall, 'rest');
      const graphqlMetrics = extractMetrics(status.graphqlApiCall, 'graphql');
      
      // Helper function to determine if an API call was successful
      const isApiCallSuccessful = (apiCall: any, testStatus: string) => {
        if (!apiCall) return false;
        
        // Check if success property exists and use it
        if (apiCall.success !== undefined) {
          console.log(`🔍 Using explicit success property:`, apiCall.success);
          return apiCall.success;
        }
        
        // If no success property, infer success from available data
        // If the test completed and we have response data, consider it successful
        if (testStatus === 'completed' && apiCall.responseBody) {
          console.log(`🔍 Test completed with response body - considering successful`);
          return true;
        }
        
        // If we have response data but test isn't completed, still likely successful
        if (apiCall.responseBody && typeof apiCall.responseBody === 'object') {
          console.log(`🔍 Has response body - considering successful`);
          return true;
        }
        
        // Default to false if we can't determine
        console.log(`🔍 Cannot determine success - defaulting to false`);
        return false;
      };
      
      // Add test start event
      if (status.startTime) {
        events.push({
          id: `${status.id}-start`,
          timestamp: new Date(status.startTime),
          type: 'test_start',
          testId: status.id,
          level: 'info',
          message: `Started test: ${status.testType}`
        });
      }

      // Add progress events for running tests
      if (status.status === 'running' && status.progress > 0) {
        events.push({
          id: `${status.id}-progress`,
          timestamp: new Date(),
          type: 'test_progress',
          testId: status.id,
          level: 'info',
          message: `Test progress: ${status.progress}%`,
          metadata: {
            progress: status.progress
          }
        });
      }

      // Add API call events
      if (status.restApiCall) {
        const restSuccess = isApiCallSuccessful(status.restApiCall, status.status);
        events.push({
          id: `${status.id}-rest`,
          timestamp: new Date(status.endTime || Date.now()),
          type: 'api_call',
          testId: status.id,
          level: restSuccess ? 'success' : 'error',
          message: `REST API call ${restSuccess ? 'completed' : 'failed'}`,
          metadata: {
            apiType: 'rest',
            apiUrl: status.restApiCall.url || status.restApiCall.endpoint,
            apiMethod: status.restApiCall.method,
            responseTime: restMetrics.responseTime,
            payloadSize: restMetrics.payloadSize,
            success: restSuccess
          }
        });
      }

      if (status.graphqlApiCall) {
        const graphqlSuccess = isApiCallSuccessful(status.graphqlApiCall, status.status);
        events.push({
          id: `${status.id}-graphql`,
          timestamp: new Date(status.endTime || Date.now()),
          type: 'api_call',
          testId: status.id,
          level: graphqlSuccess ? 'success' : 'error',
          message: `GraphQL API call ${graphqlSuccess ? 'completed' : 'failed'}`,
          metadata: {
            apiType: 'graphql',
            apiUrl: status.graphqlApiCall.url || status.graphqlApiCall.endpoint,
            apiMethod: status.graphqlApiCall.method,
            responseTime: graphqlMetrics.responseTime,
            payloadSize: graphqlMetrics.payloadSize,
            success: graphqlSuccess
          }
        });
      }

      // Add completion event
      if (status.status === 'completed' && status.endTime) {
        const winner = restMetrics.responseTime && graphqlMetrics.responseTime
          ? (restMetrics.responseTime < graphqlMetrics.responseTime ? 'rest' : 'graphql')
          : undefined;

        events.push({
          id: `${status.id}-complete`,
          timestamp: new Date(status.endTime),
          type: 'test_complete',
          testId: status.id,
          level: 'success',
          message: `Test completed successfully${winner ? ` - ${winner.toUpperCase()} wins` : ''}`,
          metadata: {
            winner,
            responseTime: winner === 'graphql' ? graphqlMetrics.responseTime : restMetrics.responseTime,
            dataComparison: status.dataComparison
          }
        });
      }

      // Add failure event
      if (status.status === 'failed' && status.endTime) {
        events.push({
          id: `${status.id}-failed`,
          timestamp: new Date(status.endTime),
          type: 'test_failed',
          testId: status.id,
          level: 'error',
          message: `Test failed: ${status.error || 'Unknown error'}`,
          metadata: {
            error: status.error
          }
        });
      }

      // Sort events by timestamp
      events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      console.log('🔍 Processing status:', status.id, {
        restApiCall: status.restApiCall,
        graphqlApiCall: status.graphqlApiCall,
        dataComparison: status.dataComparison,
        status: status.status
      });

      const summary = status.status === 'completed' ? {
        restResponseTime: restMetrics.responseTime,
        graphqlResponseTime: graphqlMetrics.responseTime,
        winner: restMetrics.responseTime && graphqlMetrics.responseTime
          ? (restMetrics.responseTime < graphqlMetrics.responseTime ? 'rest' : 'graphql')
          : undefined,
        dataConsistency: status.dataComparison?.dataConsistency,
        restPayloadSize: restMetrics.payloadSize,
        graphqlPayloadSize: graphqlMetrics.payloadSize,
        totalDuration: status.startTime && status.endTime
          ? (new Date(status.endTime).getTime() - new Date(status.startTime).getTime()) / 1000
          : undefined
      } : undefined;

      console.log('🔍 Raw response times for', status.id, ':', {
        restResponseTime: status.restApiCall?.responseTime,
        graphqlResponseTime: status.graphqlApiCall?.responseTime,
        restPayloadSize: status.restApiCall?.payloadSize,
        graphqlPayloadSize: status.graphqlApiCall?.payloadSize,
        restApiCall: status.restApiCall,
        graphqlApiCall: status.graphqlApiCall
      });
      
      // Log the actual structure to debug data mismatch
      console.log('🔍 Actual structure check for', status.id, ':', {
        restApiCallKeys: status.restApiCall ? Object.keys(status.restApiCall) : [],
        graphqlApiCallKeys: status.graphqlApiCall ? Object.keys(status.graphqlApiCall) : [],
        restApiCallFull: status.restApiCall,
        graphqlApiCallFull: status.graphqlApiCall
      });

      console.log('🔍 Generated summary for', status.id, ':', summary);

      return {
        id: status.id,
        name: status.testType,
        status: status.status,
        startTime: status.startTime ? new Date(status.startTime) : undefined,
        endTime: status.endTime ? new Date(status.endTime) : undefined,
        progress: status.progress,
        events,
        summary
      };
    });
  }, [testStatuses]);

  // Filter timeline tests
  const filteredTests = useMemo(() => {
    return timelineTests.filter(test => {
      // Filter by test status
      if (filters.testStatus && filters.testStatus.length > 0) {
        if (!filters.testStatus.includes(test.status)) {
          return false;
        }
      }

      // Filter by search term
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = test.name.toLowerCase().includes(searchLower);
        const matchesEvents = test.events.some(event =>
          event.message.toLowerCase().includes(searchLower)
        );
        if (!matchesName && !matchesEvents) {
          return false;
        }
      }

      // Filter events within the test
      if (filters.eventTypes || filters.eventLevels) {
        test.events = test.events.filter(event => {
          if (filters.eventTypes && filters.eventTypes.length > 0) {
            if (!filters.eventTypes.includes(event.type)) {
              return false;
            }
          }
          if (filters.eventLevels && filters.eventLevels.length > 0) {
            if (!filters.eventLevels.includes(event.level)) {
              return false;
            }
          }
          return true;
        });
      }

      return true;
    });
  }, [timelineTests, filters]);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timelineTests, autoScroll]);

  const handleToggleExpanded = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const handleTestSelect = (testId: string) => {
    const testStatus = testStatuses.find(status => status.id === testId);
    if (testStatus && (testStatus.restApiCall || testStatus.graphqlApiCall)) {
      setSelectedTest(testStatus);
      setIsModalOpen(true);
    }
    onTestSelect?.(testId);
  };

  const handleExpandAll = () => {
    setExpandedTests(new Set(filteredTests.map(t => t.id)));
  };

  const handleCollapseAll = () => {
    setExpandedTests(new Set());
  };

  const totalEvents = filteredTests.reduce((sum, test) => sum + test.events.length, 0);
  const runningTests = filteredTests.filter(t => t.status === 'running').length;
  const completedTests = filteredTests.filter(t => t.status === 'completed').length;
  const failedTests = filteredTests.filter(t => t.status === 'failed').length;
  const successfulTests = filteredTests.filter(t => 
    t.status === 'completed' && 
    (t.summary?.dataConsistency === undefined || t.summary?.dataConsistency > 0)
  ).length;
  const actualSuccessRate = filteredTests.length > 0 ? (successfulTests / filteredTests.length) * 100 : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <ApiCallDetailsModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        restApiCall={selectedTest?.restApiCall}
        graphqlApiCall={selectedTest?.graphqlApiCall}
        dataComparison={selectedTest?.dataComparison}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Execution Timeline</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isRunning ? 'default' : 'secondary'}>
              {isRunning ? 'Running' : 'Ready'}
            </Badge>
            <span className="text-sm text-gray-600">
              {filteredTests.length} tests • {totalEvents} events
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Show results button when tests have been completed */}
          {!isRunning && testResults.length > 0 && onShowCompletionModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={onShowCompletionModal}
            >
              <Trophy className="w-4 h-4 mr-2" />
              View Results
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Filters
          </Button>
          {onToggleExpanded && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleExpanded}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isExpanded ? 'Minimize' : 'Expand'}
            </Button>
          )}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(filteredTests)}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <TimelineFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters({})}
          totalTests={timelineTests.length}
          filteredTests={filteredTests.length}
          totalEvents={timelineTests.reduce((sum, test) => sum + test.events.length, 0)}
          filteredEvents={totalEvents}
        />
      )}

      {/* Timeline Content */}
      <ScrollArea 
        ref={scrollRef}
        className="border rounded-lg"
        style={{ height: maxHeight }}
      >
        <div className="p-4 space-y-4">
          {filteredTests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {timelineTests.length === 0 ? 'No tests running' : 'No tests match filters'}
                </h3>
                <p className="text-gray-600 text-center">
                  {timelineTests.length === 0
                    ? 'Configure and run tests to see their execution timeline'
                    : 'Try adjusting your filters to see more results'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTests.map((test) => (
              <TimelineCard
                key={test.id}
                test={test}
                onViewDetails={handleTestSelect}
                isExpanded={expandedTests.has(test.id)}
                onToggleExpanded={handleToggleExpanded}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Summary Stats */}
      {filteredTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Session Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{runningTests}</div>
                <div className="text-gray-600">Running</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{successfulTests}</div>
                <div className="text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                <div className="text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{totalEvents}</div>
                <div className="text-gray-600">Total Events</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  actualSuccessRate >= 80 ? 'text-green-600' :
                  actualSuccessRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {actualSuccessRate.toFixed(0)}%
                </div>
                <div className="text-gray-600">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};