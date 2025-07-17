import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Settings, 
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { LogFilters } from './types';

interface ConsoleHeaderProps {
  filters: LogFilters;
  onFiltersChange: (filters: LogFilters) => void;
  logCount: number;
  filteredCount: number;
  onClearLogs: () => void;
  onExport: () => void;
  onShowHelp: () => void;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  filters,
  onFiltersChange,
  logCount,
  filteredCount,
  onClearLogs,
  onExport,
  onShowHelp
}) => {
  const [searchFocused, setSearchFocused] = useState(false);

  const testTypeOptions = [
    'Dot-Walking Tests',
    'Multi-Table Tests', 
    'Schema Tailoring Tests',
    'Performance Scale Tests',
    'Real-World Scenarios',
    'Custom Requests'
  ];

  const logLevelOptions = [
    { value: 'info', label: 'Info', color: 'bg-blue-500' },
    { value: 'success', label: 'Success', color: 'bg-green-500' },
    { value: 'warning', label: 'Warning', color: 'bg-yellow-500' },
    { value: 'error', label: 'Error', color: 'bg-red-500' }
  ] as const;

  const apiTypeOptions = [
    { value: 'rest', label: 'REST' },
    { value: 'graphql', label: 'GraphQL' },
    { value: 'both', label: 'Both' }
  ] as const;

  const dataConsistencyOptions = [
    { value: 'all', label: 'All Results' },
    { value: 'issues-only', label: 'Issues Only' },
    { value: 'perfect-only', label: 'Perfect Only' }
  ] as const;

  const activeFiltersCount = 
    (filters.testTypes.length > 0 ? 1 : 0) +
    (filters.logLevels.length < 4 ? 1 : 0) +
    (filters.apiTypes.length < 3 ? 1 : 0) +
    (filters.dataConsistency !== 'all' ? 1 : 0) +
    (filters.searchQuery.length > 0 ? 1 : 0);

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-sm font-medium text-gray-200">Live Console</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredCount} / {logCount}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className={`relative flex-1 transition-all ${searchFocused ? 'flex-1' : ''}`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search logs..."
              value={filters.searchQuery}
              onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="pl-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700">
                <Filter className="w-4 h-4 mr-1" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Test Types</DropdownMenuLabel>
              {testTypeOptions.map((testType) => (
                <DropdownMenuCheckboxItem
                  key={testType}
                  checked={filters.testTypes.includes(testType)}
                  onCheckedChange={(checked) => {
                    const newTestTypes = checked
                      ? [...filters.testTypes, testType]
                      : filters.testTypes.filter(t => t !== testType);
                    onFiltersChange({ ...filters, testTypes: newTestTypes });
                  }}
                >
                  {testType}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Log Levels</DropdownMenuLabel>
              {logLevelOptions.map((level) => (
                <DropdownMenuCheckboxItem
                  key={level.value}
                  checked={filters.logLevels.includes(level.value)}
                  onCheckedChange={(checked) => {
                    const newLogLevels = checked
                      ? [...filters.logLevels, level.value]
                      : filters.logLevels.filter(l => l !== level.value);
                    onFiltersChange({ ...filters, logLevels: newLogLevels });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${level.color}`} />
                    {level.label}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>API Types</DropdownMenuLabel>
              {apiTypeOptions.map((apiType) => (
                <DropdownMenuCheckboxItem
                  key={apiType.value}
                  checked={filters.apiTypes.includes(apiType.value)}
                  onCheckedChange={(checked) => {
                    const newApiTypes = checked
                      ? [...filters.apiTypes, apiType.value]
                      : filters.apiTypes.filter(a => a !== apiType.value);
                    onFiltersChange({ ...filters, apiTypes: newApiTypes });
                  }}
                >
                  {apiType.label}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Data Consistency</DropdownMenuLabel>
              {dataConsistencyOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.dataConsistency === option.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onFiltersChange({ ...filters, dataConsistency: option.value });
                    }
                  }}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearLogs}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onShowHelp}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};