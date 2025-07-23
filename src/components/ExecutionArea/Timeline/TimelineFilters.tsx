import React, { useState } from 'react';
import { TimelineFilters as TimelineFiltersType } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  CheckCircle, 
  XCircle, 
  PlayCircle, 
  PauseCircle,
  Info,
  Bug,
  AlertCircle,
  Activity,
  Globe
} from 'lucide-react';

interface TimelineFiltersProps {
  filters: TimelineFiltersType;
  onFiltersChange: (filters: TimelineFiltersType) => void;
  onClearFilters: () => void;
  totalTests?: number;
  filteredTests?: number;
  totalEvents?: number;
  filteredEvents?: number;
}

export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  totalTests = 0,
  filteredTests = 0,
  totalEvents = 0,
  filteredEvents = 0
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({
      ...filters,
      searchTerm: value || undefined
    });
  };

  const toggleTestStatus = (status: 'pending' | 'running' | 'completed' | 'failed') => {
    const current = filters.testStatus || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    
    onFiltersChange({
      ...filters,
      testStatus: updated.length > 0 ? updated : undefined
    });
  };

  const toggleEventType = (type: 'test_start' | 'test_progress' | 'api_call' | 'test_complete' | 'test_failed' | 'info' | 'debug' | 'error') => {
    const current = filters.eventTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    
    onFiltersChange({
      ...filters,
      eventTypes: updated.length > 0 ? updated : undefined
    });
  };

  const toggleEventLevel = (level: 'info' | 'debug' | 'error' | 'success' | 'warning') => {
    const current = filters.eventLevels || [];
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    
    onFiltersChange({
      ...filters,
      eventLevels: updated.length > 0 ? updated : undefined
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircle className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'failed':
        return <XCircle className="w-3 h-3" />;
      default:
        return <PauseCircle className="w-3 h-3" />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'test_start':
        return <Activity className="w-3 h-3" />;
      case 'api_call':
        return <Globe className="w-3 h-3" />;
      case 'info':
        return <Info className="w-3 h-3" />;
      case 'debug':
        return <Bug className="w-3 h-3" />;
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  const activeFiltersCount = [
    filters.testStatus?.length || 0,
    filters.eventTypes?.length || 0,
    filters.eventLevels?.length || 0,
    filters.searchTerm ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search timeline events..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          disabled={activeFiltersCount === 0}
        >
          <X className="w-4 h-4 mr-1" />
          Clear ({activeFiltersCount})
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center space-x-4">
        {/* Test Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Test Status
              {filters.testStatus && filters.testStatus.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.testStatus.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Test Status</h4>
              {['pending', 'running', 'completed', 'failed'].map((status) => (
                <Button
                  key={status}
                  variant={filters.testStatus?.includes(status as any) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleTestStatus(status as any)}
                  className="w-full justify-start"
                >
                  {getStatusIcon(status)}
                  <span className="ml-2 capitalize">{status}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Event Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-1" />
              Event Type
              {filters.eventTypes && filters.eventTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.eventTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Event Types</h4>
              {['test_start', 'test_progress', 'api_call', 'test_complete', 'test_failed', 'info', 'debug', 'error'].map((type) => (
                <Button
                  key={type}
                  variant={filters.eventTypes?.includes(type as any) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleEventType(type as any)}
                  className="w-full justify-start"
                >
                  {getEventTypeIcon(type)}
                  <span className="ml-2 capitalize">{type.replace('_', ' ')}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Event Level Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Info className="w-4 h-4 mr-1" />
              Level
              {filters.eventLevels && filters.eventLevels.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.eventLevels.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Event Levels</h4>
              {['info', 'debug', 'success', 'warning', 'error'].map((level) => (
                <Button
                  key={level}
                  variant={filters.eventLevels?.includes(level as any) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleEventLevel(level as any)}
                  className="w-full justify-start"
                >
                  <span className="ml-2 capitalize">{level}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 border-t pt-4">
        <div className="flex items-center justify-between">
          <span>
            Showing {filteredTests} of {totalTests} tests • {filteredEvents} of {totalEvents} events
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-blue-600">
              {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
            </span>
          )}
        </div>
      </div>
    </div>
  );
};