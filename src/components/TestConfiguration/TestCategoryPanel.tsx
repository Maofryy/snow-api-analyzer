
import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useBenchmark } from '../../contexts/BenchmarkContext';

interface TestCategoryPanelProps {
  title: string;
  testKey: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function TestCategoryPanel({ title, testKey, isOpen, onToggle }: TestCategoryPanelProps) {
  const { state, dispatch } = useBenchmark();
  const testConfig = state.testConfiguration[testKey as keyof typeof state.testConfiguration];

  const updateTestConfig = (updates: any) => {
    dispatch({
      type: 'UPDATE_TEST_CONFIG',
      payload: {
        [testKey]: {
          ...testConfig,
          ...updates,
        },
      },
    });
  };

  const updateParameters = (paramUpdates: any) => {
    updateTestConfig({
      parameters: {
        ...testConfig.parameters,
        ...paramUpdates,
      },
    });
  };

  const renderParameterControls = () => {
    switch (testKey) {
      case 'fieldSelectionTests':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="table" className="font-mono text-sm">Table</Label>
              <Select 
                value={testConfig.parameters.table} 
                onValueChange={(value) => updateParameters({ table: value })}
              >
                <SelectTrigger className="code-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">incident</SelectItem>
                  <SelectItem value="change_request">change_request</SelectItem>
                  <SelectItem value="problem">problem</SelectItem>
                  <SelectItem value="kb_knowledge">kb_knowledge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="recordLimit" className="font-mono text-sm">Record Limit</Label>
              <Input
                id="recordLimit"
                type="number"
                value={testConfig.parameters.recordLimit}
                onChange={(e) => updateParameters({ recordLimit: parseInt(e.target.value) })}
                className="code-input"
              />
            </div>
          </div>
        );

      case 'relationshipTests':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="depth" className="font-mono text-sm">Relationship Depth</Label>
              <Input
                id="depth"
                type="number"
                value={testConfig.parameters.depth}
                onChange={(e) => updateParameters({ depth: parseInt(e.target.value) })}
                className="code-input"
                min="1"
                max="5"
              />
            </div>
          </div>
        );

      case 'filteringTests':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="filterTable" className="font-mono text-sm">Table</Label>
              <Select 
                value={testConfig.parameters.table} 
                onValueChange={(value) => updateParameters({ table: value })}
              >
                <SelectTrigger className="code-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">incident</SelectItem>
                  <SelectItem value="change_request">change_request</SelectItem>
                  <SelectItem value="problem">problem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="complexity" className="font-mono text-sm">Filter Complexity</Label>
              <Select 
                value={testConfig.parameters.filterComplexity} 
                onValueChange={(value) => updateParameters({ filterComplexity: value })}
              >
                <SelectTrigger className="code-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                  <SelectItem value="nested">Nested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'paginationTests':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pageSize" className="font-mono text-sm">Page Size</Label>
              <Input
                id="pageSize"
                type="number"
                value={testConfig.parameters.pageSize}
                onChange={(e) => updateParameters({ pageSize: parseInt(e.target.value) })}
                className="code-input"
              />
            </div>
            
            <div>
              <Label htmlFor="totalRecords" className="font-mono text-sm">Total Records</Label>
              <Input
                id="totalRecords"
                type="number"
                value={testConfig.parameters.totalRecords}
                onChange={(e) => updateParameters({ totalRecords: parseInt(e.target.value) })}
                className="code-input"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border border-gray-200 rounded-lg bg-white">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto font-mono hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <Switch
                checked={testConfig.enabled}
                onCheckedChange={(enabled) => updateTestConfig({ enabled })}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="font-medium">{title}</span>
              {testConfig.enabled && (
                <span className="bg-success/20 text-success-dark px-2 py-1 rounded text-xs">
                  ENABLED
                </span>
              )}
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-4">
              {renderParameterControls()}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
