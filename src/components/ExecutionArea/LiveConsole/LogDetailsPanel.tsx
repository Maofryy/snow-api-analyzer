import React, { useState } from 'react';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  Copy, 
  Check, 
  Clock, 
  Database, 
  Code,
  BarChart3,
  FileText,
  Download
} from 'lucide-react';
import { LogEntry } from './types';
import { MetricsInline } from './MetricsInline';

interface LogDetailsPanelProps {
  entry: LogEntry | null;
  open: boolean;
  onClose: () => void;
  position?: 'sidebar' | 'modal';
}

export const LogDetailsPanel: React.FC<LogDetailsPanelProps> = ({
  entry,
  open,
  onClose,
  position = 'sidebar'
}) => {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleCopy = async (content: string, key: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const CopyButton: React.FC<{ content: string; copyKey: string }> = ({ content, copyKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 hover:bg-gray-200"
      onClick={() => handleCopy(content, copyKey)}
    >
      {copiedStates[copyKey] ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-gray-500" />
      )}
    </Button>
  );

  const formatJson = (obj: unknown) => {
    if (!obj) return '';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  if (!entry) return null;

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {entry.level}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {entry.category}
          </Badge>
          {entry.testType && (
            <Badge variant="outline" className="text-xs">
              {entry.testType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">
            {entry.timestamp.toLocaleString()}
          </span>
          <CopyButton content={entry.id} copyKey="entry-id" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Message</span>
          <CopyButton content={entry.message} copyKey="message" />
        </div>
        <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm">
          {entry.message}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="api">API Calls</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Entry ID</span>
              <div className="font-mono text-xs text-gray-600 break-all">
                {entry.id}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Test ID</span>
              <div className="font-mono text-xs text-gray-600">
                {entry.testId || 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Category</span>
              <div className="font-mono text-xs text-gray-600">
                {entry.category}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Level</span>
              <div className="font-mono text-xs text-gray-600">
                {entry.level}
              </div>
            </div>
          </div>
          
          {entry.actions && entry.actions.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700">Available Actions</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {entry.actions.map(action => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className="text-xs"
                  >
                    <action.icon className="w-3 h-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          {entry.metadata?.performance ? (
            <MetricsInline 
              performance={entry.metadata.performance}
              dataComparison={entry.metadata.dataComparison}
              compact={false}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No performance data available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="api" className="space-y-4">
          {entry.metadata?.apiCall ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {entry.metadata.apiCall.type.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-medium">
                    {entry.metadata.apiCall.method || 'POST'}
                  </span>
                </div>
                <CopyButton content={entry.metadata.apiCall.endpoint} copyKey="endpoint" />
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-mono text-sm break-all">
                  {entry.metadata.apiCall.endpoint}
                </div>
              </div>
              
              {entry.metadata.apiCall.query && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Query</span>
                    <CopyButton content={entry.metadata.apiCall.query} copyKey="query" />
                  </div>
                  <pre className="p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-32">
                    {entry.metadata.apiCall.query}
                  </pre>
                </div>
              )}
            </div>
          ) : entry.metadata?.testStatus?.restApiCall || entry.metadata?.testStatus?.graphqlApiCall ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                API call details available in test status. 
                Use the "View Details" button to see full API information.
              </p>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Code className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No API call data available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4">
          {entry.metadata?.dataComparison ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Data Consistency</span>
                <Badge variant={
                  entry.metadata.dataComparison.isEquivalent ? "default" : 
                  entry.metadata.dataComparison.onlyKnownIssues ? "secondary" : 
                  "destructive"
                }>
                  {entry.metadata.dataComparison.dataConsistency}%
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">REST Records</span>
                  <div className="font-mono text-lg">
                    {entry.metadata.dataComparison.restRecordCount}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">GraphQL Records</span>
                  <div className="font-mono text-lg">
                    {entry.metadata.dataComparison.graphqlRecordCount}
                  </div>
                </div>
              </div>
              
              {entry.metadata.dataComparison.issues.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Issues</span>
                  <ul className="mt-1 space-y-1 text-sm">
                    {entry.metadata.dataComparison.issues.map((issue, index) => (
                      <li key={index} className="text-red-600">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {entry.metadata.dataComparison.fieldMismatches.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Field Mismatches</span>
                  <div className="mt-1 max-h-32 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1">Field</th>
                          <th className="text-left p-1">REST</th>
                          <th className="text-left p-1">GraphQL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.metadata.dataComparison.fieldMismatches.slice(0, 10).map((mismatch, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-1 font-mono">{mismatch.field}</td>
                            <td className="p-1 font-mono break-all">{JSON.stringify(mismatch.restValue)}</td>
                            <td className="p-1 font-mono break-all">{JSON.stringify(mismatch.graphqlValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No data comparison available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const exportData = {
              entry,
              exportedAt: new Date().toISOString(),
              type: 'log-entry-export'
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `log-entry-${entry.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );

  if (position === 'modal') {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="max-w-2xl">
          <SheetHeader>
            <SheetTitle>Log Entry Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="border-l border-gray-200 bg-gray-50 p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Log Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      {content}
    </div>
  );
};