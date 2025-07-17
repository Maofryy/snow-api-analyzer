import React, { useState } from 'react';
import { ProcessedTestSpec } from '../../services/testSpecsService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Copy, Check, Code, Globe, Database } from 'lucide-react';
import { useBenchmark } from '../../contexts/BenchmarkContext';

interface CodePreviewProps {
  spec: ProcessedTestSpec;
  onCopy: (content: string, key: string) => void;
  copiedStates: Record<string, boolean>;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ spec, onCopy, copiedStates }) => {
  const { state } = useBenchmark();
  const [activeApi, setActiveApi] = useState<'rest' | 'graphql'>('rest');
  
  // Get the actual instance URL, fallback to placeholder if not available
  const instanceUrl = state.instance?.url || 'https://your-instance.service-now.com';
  
  const CopyButton: React.FC<{ content: string; copyKey: string }> = ({ content, copyKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={() => onCopy(content, copyKey)}
    >
      {copiedStates[copyKey] ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
  
  const formatRestEndpoint = (endpoint: string) => {
    if (endpoint.includes('\n')) {
      // Multi-table scenario
      return endpoint.split('\n').map((line, index) => (
        <div key={index} className="mb-2">
          <span className="text-blue-600 font-medium">Call {index + 1}:</span>
          <div className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
            {line}
          </div>
        </div>
      ));
    } else {
      // Single endpoint
      return (
        <div className="font-mono text-sm bg-gray-50 p-3 rounded break-all">
          {endpoint}
        </div>
      );
    }
  };
  
  const formatGraphQLQuery = (query: string) => {
    return (
      <pre className="font-mono text-sm bg-gray-50 p-3 rounded overflow-x-auto">
        <code>{query}</code>
      </pre>
    );
  };
  
  const generateRestServerScript = (endpoint: string) => {
    if (endpoint.includes('\n')) {
      // Multi-table scenario
      const calls = endpoint.split('\n').map((line, index) => {
        return `// REST Call ${index + 1}
var restMessage${index + 1} = new sn_ws.RESTMessageV2();
restMessage${index + 1}.setHttpMethod('GET');
restMessage${index + 1}.setEndpoint('${instanceUrl}${line}');
restMessage${index + 1}.setRequestHeader('Content-Type', 'application/json');
restMessage${index + 1}.setRequestHeader('Accept', 'application/json');

var response${index + 1} = restMessage${index + 1}.execute();
var responseBody${index + 1} = response${index + 1}.getBody();
var httpStatus${index + 1} = response${index + 1}.getStatusCode();

gs.info('REST Call ${index + 1} Status: ' + httpStatus${index + 1});
gs.info('REST Call ${index + 1} Response: ' + responseBody${index + 1});

var data${index + 1} = JSON.parse(responseBody${index + 1});`;
      });
      return calls.join('\n\n');
    } else {
      return `var restMessage = new sn_ws.RESTMessageV2();
restMessage.setHttpMethod('GET');
restMessage.setEndpoint('${instanceUrl}${endpoint}');
restMessage.setRequestHeader('Content-Type', 'application/json');
restMessage.setRequestHeader('Accept', 'application/json');

var response = restMessage.execute();
var responseBody = response.getBody();
var httpStatus = response.getStatusCode();

gs.info('REST Status: ' + httpStatus);
gs.info('REST Response: ' + responseBody);

var data = JSON.parse(responseBody);`;
    }
  };
  
  const generateGraphQLServerScript = (query: string) => {
    return `var restMessage = new sn_ws.RESTMessageV2();
restMessage.setHttpMethod('POST');
restMessage.setEndpoint('${instanceUrl}/api/now/graphql');
restMessage.setRequestHeader('Content-Type', 'application/json');
restMessage.setRequestHeader('Accept', 'application/json');

var queryPayload = {
    query: \`${query.trim()}\`
};

restMessage.setRequestBody(JSON.stringify(queryPayload));

var response = restMessage.execute();
var responseBody = response.getBody();
var httpStatus = response.getStatusCode();

gs.info('GraphQL Status: ' + httpStatus);
gs.info('GraphQL Response: ' + responseBody);

var data = JSON.parse(responseBody);`;
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeApi} onValueChange={(value) => setActiveApi(value as 'rest' | 'graphql')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rest" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            REST API
          </TabsTrigger>
          <TabsTrigger value="graphql" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            GraphQL
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rest" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    REST Endpoint
                  </CardTitle>
                  <CopyButton content={spec.restEndpoint} copyKey="rest-endpoint" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {formatRestEndpoint(spec.restEndpoint)}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">ServiceNow Server Script</CardTitle>
                  <CopyButton content={generateRestServerScript(spec.restEndpoint)} copyKey="rest-server-script" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="font-mono text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                  <code>{generateRestServerScript(spec.restEndpoint)}</code>
                </pre>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">JavaScript Example</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="font-mono text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                  <code>{`const response = await fetch('${spec.restEndpoint}', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa('username:password')
  }
});

const data = await response.json();
console.log(data.result);`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="graphql" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    GraphQL Query
                  </CardTitle>
                  <CopyButton content={spec.graphqlQuery} copyKey="graphql-query" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {formatGraphQLQuery(spec.graphqlQuery)}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">ServiceNow Server Script</CardTitle>
                  <CopyButton content={generateGraphQLServerScript(spec.graphqlQuery)} copyKey="graphql-server-script" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="font-mono text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                  <code>{generateGraphQLServerScript(spec.graphqlQuery)}</code>
                </pre>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">JavaScript Example</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="font-mono text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                  <code>{`const response = await fetch('/api/now/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa('username:password')
  },
  body: JSON.stringify({
    query: \`${spec.graphqlQuery.trim()}\`
  })
});

const data = await response.json();
console.log(data.data.GlideRecord_Query);`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Comparison Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-3">🟢 REST API</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Request Count:</span>
                  <Badge variant="outline">
                    {spec.restCalls ? spec.restCalls.length : 1}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Fields Requested:</span>
                  <Badge variant="outline">{spec.expectedFields.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Dot-walking Depth:</span>
                  <Badge variant="outline">{spec.dotWalkingDepth}</Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-700 mb-3">🔵 GraphQL</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Request Count:</span>
                  <Badge variant="outline">1</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Fields Requested:</span>
                  <Badge variant="outline">{Object.keys(spec.graphqlFields).length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Relationship Depth:</span>
                  <Badge variant="outline">{spec.dotWalkingDepth}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Schema Flexibility:</span>
                  <Badge className="bg-blue-100 text-blue-800">High</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};