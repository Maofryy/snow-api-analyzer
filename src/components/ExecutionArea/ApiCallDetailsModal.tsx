import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { DataComparisonResult } from '@/types';

interface ApiCallDetailsModalProps {
  open: boolean;
  onClose: () => void;
  restApiCall?: {
    endpoint: string;
    method: string;
    requestBody?: unknown;
    responseBody?: unknown;
    headers?: Record<string, string>;
  };
  graphqlApiCall?: {
    endpoint: string;
    query: string;
    variables?: unknown;
    requestBody?: unknown;
    responseBody?: unknown;
    headers?: Record<string, string>;
  };
  dataComparison?: DataComparisonResult;
}

function formatJson(obj: unknown) {
  if (!obj) return '';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export const ApiCallDetailsModal: React.FC<ApiCallDetailsModalProps> = ({ open, onClose, restApiCall, graphqlApiCall, dataComparison }) => {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleCopy = async (content: string, key: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>API Call Details</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={dataComparison ? 'comparison' : (restApiCall ? 'rest' : 'graphql')} className="mt-2 flex-1 overflow-hidden flex flex-col">
          <TabsList>
            {dataComparison && <TabsTrigger value="comparison">Data Comparison</TabsTrigger>}
            {restApiCall && <TabsTrigger value="rest">REST</TabsTrigger>}
            {graphqlApiCall && <TabsTrigger value="graphql">GraphQL</TabsTrigger>}
          </TabsList>
          {restApiCall && (
            <TabsContent value="rest" className="flex-1 overflow-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <strong>Endpoint:</strong>
                  <CopyButton content={restApiCall.endpoint} copyKey="rest-endpoint" />
                </div>
                <div className="font-mono break-all text-sm bg-gray-50 p-2 rounded">{restApiCall.endpoint}</div>
                
                <div><strong>Method:</strong> <span className="font-mono">{restApiCall.method}</span></div>
                
                {restApiCall.requestBody && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <strong>Request Body:</strong>
                      <CopyButton content={formatJson(restApiCall.requestBody)} copyKey="rest-request" />
                    </div>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">{formatJson(restApiCall.requestBody)}</pre>
                  </div>
                )}
                {restApiCall.responseBody && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <strong>Response Body:</strong>
                      <CopyButton content={formatJson(restApiCall.responseBody)} copyKey="rest-response" />
                    </div>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-64">{formatJson(restApiCall.responseBody)}</pre>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          {graphqlApiCall && (
            <TabsContent value="graphql" className="flex-1 overflow-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <strong>Endpoint:</strong>
                  <CopyButton content={graphqlApiCall.endpoint} copyKey="graphql-endpoint" />
                </div>
                <div className="font-mono break-all text-sm bg-gray-50 p-2 rounded">{graphqlApiCall.endpoint}</div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <strong>Query:</strong>
                    <CopyButton content={graphqlApiCall.query} copyKey="graphql-query" />
                  </div>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">{graphqlApiCall.query}</pre>
                </div>
                {graphqlApiCall.variables && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <strong>Variables:</strong>
                      <CopyButton content={formatJson(graphqlApiCall.variables)} copyKey="graphql-variables" />
                    </div>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">{formatJson(graphqlApiCall.variables)}</pre>
                  </div>
                )}
                {graphqlApiCall.requestBody && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <strong>Request Body:</strong>
                      <CopyButton content={formatJson(graphqlApiCall.requestBody)} copyKey="graphql-request" />
                    </div>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">{formatJson(graphqlApiCall.requestBody)}</pre>
                  </div>
                )}
                {graphqlApiCall.responseBody && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <strong>Response Body:</strong>
                      <CopyButton content={formatJson(graphqlApiCall.responseBody)} copyKey="graphql-response" />
                    </div>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-64">{formatJson(graphqlApiCall.responseBody)}</pre>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          {dataComparison && (
            <TabsContent value="comparison" className="flex-1 overflow-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <strong>Data Equivalence:</strong>
                  <Badge variant={
                    dataComparison.isEquivalent ? "default" : 
                    dataComparison.onlyKnownIssues ? "secondary" : 
                    "destructive"
                  }>
                    {dataComparison.isEquivalent ? "✓ Equivalent" : 
                     dataComparison.onlyKnownIssues ? "⚠ Known Issues Only" : 
                     "✗ Not Equivalent"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>REST Records:</strong> <span className="font-mono">{dataComparison.restRecordCount}</span>
                  </div>
                  <div>
                    <strong>GraphQL Records:</strong> <span className="font-mono">{dataComparison.graphqlRecordCount}</span>
                  </div>
                </div>

                <div>
                  <strong>Data Consistency:</strong> 
                  <div className="flex items-center gap-2 mt-1">
                    <div className="bg-gray-200 rounded-full h-2 flex-1">
                      <div 
                        className={`h-2 rounded-full ${
                          dataComparison.dataConsistency >= 95 ? 'bg-green-500' : 
                          dataComparison.onlyKnownIssues ? 'bg-orange-500' : 
                          dataComparison.dataConsistency >= 80 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${dataComparison.dataConsistency}%` }}
                      ></div>
                    </div>
                    <span className="font-mono text-sm">{dataComparison.dataConsistency}%</span>
                  </div>
                </div>

                {dataComparison.issues.length > 0 && (
                  <div>
                    <strong>Issues:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {dataComparison.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-red-600">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {dataComparison.fieldMismatches.length > 0 && (
                  <div>
                    <strong>Field Mismatches:</strong>
                    <div className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-48 mt-2">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b">
                            <th className="p-1">Type</th>
                            <th className="p-1">Record #</th>
                            <th className="p-1">Field</th>
                            <th className="p-1">REST Value</th>
                            <th className="p-1">GraphQL Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataComparison.fieldMismatches.slice(0, 10).map((mismatch, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-1 text-center">
                                {mismatch.isWarning ? (
                                  <span className="text-orange-500" title="Known issue">⚠</span>
                                ) : (
                                  <span className="text-red-500" title="Error">✗</span>
                                )}
                              </td>
                              <td className="p-1 font-mono">{mismatch.recordIndex}</td>
                              <td className="p-1 font-mono">{mismatch.field}</td>
                              <td className="p-1 font-mono break-all">{JSON.stringify(mismatch.restValue)}</td>
                              <td className="p-1 font-mono break-all">{JSON.stringify(mismatch.graphqlValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {dataComparison.fieldMismatches.length > 10 && (
                        <div className="text-center mt-2 text-gray-500">
                          ... and {dataComparison.fieldMismatches.length - 10} more mismatches
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
