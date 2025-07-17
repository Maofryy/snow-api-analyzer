import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Link, 
  Database, 
  Globe,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

interface FieldsExplorerProps {
  restFields: string[];
  graphqlFields: Record<string, any>;
  table: string;
  restCalls?: Array<{
    table: string;
    fields: string[];
    filter?: string;
  }>;
}

export const FieldsExplorer: React.FC<FieldsExplorerProps> = ({
  restFields,
  graphqlFields,
  table,
  restCalls
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showDotWalkingOnly, setShowDotWalkingOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('rest');
  
  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  const getFieldType = (field: string) => {
    const parts = field.split('.');
    if (parts.length === 1) return 'direct';
    if (parts.length === 2) return 'reference';
    return 'deep-reference';
  };
  
  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'direct': return <Database className="h-4 w-4 text-blue-600" />;
      case 'reference': return <Link className="h-4 w-4 text-green-600" />;
      case 'deep-reference': return <Link className="h-4 w-4 text-purple-600" />;
      default: return <Database className="h-4 w-4 text-gray-600" />;
    }
  };
  
  const getFieldColor = (fieldType: string) => {
    switch (fieldType) {
      case 'direct': return 'bg-blue-50 border-blue-200';
      case 'reference': return 'bg-green-50 border-green-200';
      case 'deep-reference': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  
  const filteredRestFields = restFields.filter(field => {
    const matchesSearch = field.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !showDotWalkingOnly || field.includes('.');
    return matchesSearch && matchesFilter;
  });
  
  const renderGraphQLField = (
    field: string, 
    value: any, 
    depth: number = 0, 
    parentPath: string = ''
  ): React.ReactNode => {
    const currentPath = parentPath ? `${parentPath}.${field}` : field;
    const isExpanded = expandedNodes.has(currentPath);
    const hasChildren = typeof value === 'object' && value !== null && 
                       (value._reference || (value.value !== undefined || value.displayValue !== undefined));
    
    const matchesSearch = currentPath.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         field.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (searchTerm && !matchesSearch && !hasChildren) {
      return null;
    }
    
    // Check if any children match search (for expandable nodes)
    const hasMatchingChildren = hasChildren && searchTerm && 
      (value._reference ? Object.keys(value._reference).some(childField => 
        childField.toLowerCase().includes(searchTerm.toLowerCase())
      ) : false);
    
    if (searchTerm && !matchesSearch && !hasMatchingChildren) {
      return null;
    }
    
    return (
      <div key={currentPath} className="mb-1">
        <div 
          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
            selectedField === currentPath 
              ? 'bg-blue-100 border border-blue-300' 
              : 'hover:bg-gray-50 border border-transparent'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => setSelectedField(currentPath)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(currentPath);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          
          <span className={`font-mono text-sm ${depth > 0 ? 'text-gray-700' : 'text-gray-900'}`}>
            {field}
          </span>
          
          {depth > 0 && (
            <Badge variant="outline" className="text-xs">
              reference
            </Badge>
          )}
          
          {!hasChildren && (
            <div className="flex gap-1">
              {value?.value !== undefined && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">value</Badge>
              )}
              {value?.displayValue !== undefined && (
                <Badge className="bg-green-100 text-green-800 text-xs">display</Badge>
              )}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {value._reference ? (
              Object.entries(value._reference).map(([childField, childValue]) => 
                renderGraphQLField(childField, childValue, depth + 1, currentPath)
              )
            ) : (
              <div className="space-y-1">
                {value.value !== undefined && (
                  <div className="flex items-center gap-2 p-2 text-sm text-gray-600">
                    <span className="font-mono">value</span>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">primitive</Badge>
                  </div>
                )}
                {value.displayValue !== undefined && (
                  <div className="flex items-center gap-2 p-2 text-sm text-gray-600">
                    <span className="font-mono">displayValue</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">string</Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant={showDotWalkingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDotWalkingOnly(!showDotWalkingOnly)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Dot-walking Only
        </Button>
        
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rest" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            REST Fields ({filteredRestFields.length})
          </TabsTrigger>
          <TabsTrigger value="graphql" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            GraphQL Fields ({
              Object.values(graphqlFields).some(value => value && typeof value === 'object' && 'table' in value) 
                ? Object.values(graphqlFields).reduce((total, queryConfig) => {
                    if (queryConfig && typeof queryConfig === 'object' && 'fields' in queryConfig) {
                      return total + Object.keys((queryConfig as any).fields).length;
                    }
                    return total;
                  }, 0)
                : Object.keys(graphqlFields).length
            })
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rest" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">REST API Fields</CardTitle>
              {restCalls ? (
                <p className="text-sm text-gray-600">
                  Fields from {restCalls.length} table{restCalls.length > 1 ? 's' : ''}
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Fields requested from table: <code className="bg-gray-100 px-1 rounded">{table}</code>
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {restCalls ? (
                  // Multi-table display grouped by table
                  restCalls.map((call, callIndex) => (
                    <div key={callIndex} className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Database className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-sm">Table: {call.table}</span>
                        <Badge variant="secondary" className="text-xs">
                          {call.fields.length} fields
                        </Badge>
                      </div>
                      
                      {call.fields.filter(field => 
                        field.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        (!showDotWalkingOnly || field.includes('.'))
                      ).map(field => {
                        const fieldType = getFieldType(field);
                        const parts = field.split('.');
                        const uniqueKey = `${call.table}_${field}`;
                        
                        return (
                          <div
                            key={uniqueKey}
                            className={`p-3 rounded border transition-colors cursor-pointer ${
                              selectedField === uniqueKey 
                                ? 'bg-blue-50 border-blue-300' 
                                : `${getFieldColor(fieldType)} hover:bg-gray-50`
                            }`}
                            onClick={() => setSelectedField(uniqueKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getFieldIcon(fieldType)}
                                <span className="font-mono text-sm">{field}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {parts.length > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    {parts.length - 1} level{parts.length > 2 ? 's' : ''}
                                  </Badge>
                                )}
                                <Badge 
                                  className={
                                    fieldType === 'direct' ? 'bg-blue-100 text-blue-800' :
                                    fieldType === 'reference' ? 'bg-green-100 text-green-800' :
                                    'bg-purple-100 text-purple-800'
                                  }
                                >
                                  {fieldType.replace('-', ' ')}
                                </Badge>
                              </div>
                            </div>
                            
                            {parts.length > 1 && (
                              <div className="mt-2 text-xs text-gray-600">
                                <span className="font-medium">Path:</span>
                                {parts.map((part, index) => (
                                  <span key={index}>
                                    <span className="font-mono">{part}</span>
                                    {index < parts.length - 1 && <span className="mx-1">→</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  // Single table display
                  filteredRestFields.map(field => {
                    const fieldType = getFieldType(field);
                    const parts = field.split('.');
                    
                    return (
                      <div
                        key={field}
                        className={`p-3 rounded border transition-colors cursor-pointer ${
                          selectedField === field 
                            ? 'bg-blue-50 border-blue-300' 
                            : `${getFieldColor(fieldType)} hover:bg-gray-50`
                        }`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getFieldIcon(fieldType)}
                            <span className="font-mono text-sm">{field}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {parts.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {parts.length - 1} level{parts.length > 2 ? 's' : ''}
                              </Badge>
                            )}
                            <Badge 
                              className={
                                fieldType === 'direct' ? 'bg-blue-100 text-blue-800' :
                                fieldType === 'reference' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }
                            >
                              {fieldType.replace('-', ' ')}
                            </Badge>
                          </div>
                        </div>
                        
                        {parts.length > 1 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-medium">Path:</span>
                            {parts.map((part, index) => (
                              <span key={index}>
                                <span className="font-mono">{part}</span>
                                {index < parts.length - 1 && (
                                  <span className="mx-1 text-gray-400">→</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {filteredRestFields.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No fields found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="graphql" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">GraphQL Fields Structure</CardTitle>
              {/* Check if this is a multi-table scenario */}
              {Object.values(graphqlFields).some(value => value && typeof value === 'object' && 'table' in value) ? (
                <p className="text-sm text-gray-600">
                  Multi-table GraphQL query with {Object.keys(graphqlFields).length} table{Object.keys(graphqlFields).length > 1 ? 's' : ''}
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Interactive field structure for table: <code className="bg-gray-100 px-1 rounded">{table}</code>
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {/* Check if this is a multi-table scenario */}
                {Object.values(graphqlFields).some(value => value && typeof value === 'object' && 'table' in value) ? (
                  // Multi-table display grouped by table query
                  Object.entries(graphqlFields).map(([queryName, queryConfig]) => {
                    if (!queryConfig || typeof queryConfig !== 'object' || !('table' in queryConfig)) return null;
                    
                    const tableConfig = queryConfig as { table: string; filter?: string; fields: Record<string, any> };
                    
                    return (
                      <div key={queryName} className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Database className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm">Query: {queryName}</span>
                          <Badge variant="secondary" className="text-xs">
                            Table: {tableConfig.table}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Object.keys(tableConfig.fields).length} fields
                          </Badge>
                          {tableConfig.filter && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200">
                              filtered
                            </Badge>
                          )}
                        </div>
                        
                        {/* Display filter if present */}
                        {tableConfig.filter && (
                          <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-50 rounded">
                            <span className="font-medium">Filter:</span> 
                            <code className="ml-1 bg-gray-100 px-1 rounded">{tableConfig.filter}</code>
                          </div>
                        )}
                        
                        {/* Render fields for this table */}
                        <div className="ml-4">
                          {Object.entries(tableConfig.fields).map(([field, value]) => 
                            renderGraphQLField(field, value, 0, `${queryName}`)
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Single table display
                  Object.entries(graphqlFields).map(([field, value]) => 
                    renderGraphQLField(field, value)
                  )
                )}
              </div>
              
              {Object.keys(graphqlFields).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No GraphQL fields defined for this scenario.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Field Details Panel - Fixed position at bottom */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 mt-4">
        {selectedField ? (
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Field Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Field Name:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{selectedField}</code>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2">{getFieldType(selectedField.includes('_') ? selectedField.split('_')[1] : selectedField).replace('-', ' ')}</span>
                </div>
                
                {(selectedField.includes('_') ? selectedField.split('_')[1] : selectedField).includes('.') && (
                  <div>
                    <span className="font-medium text-gray-700">Relationship Depth:</span>
                    <span className="ml-2">{((selectedField.includes('_') ? selectedField.split('_')[1] : selectedField).match(/\./g) || []).length} level(s)</span>
                  </div>
                )}
                
                <div>
                  <span className="font-medium text-gray-700">Source Table:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded">
                    {selectedField.includes('_') ? selectedField.split('_')[0] : table}
                  </code>
                </div>
                
                {(selectedField.includes('_') ? selectedField.split('_')[1] : selectedField).includes('.') && (
                  <div>
                    <span className="font-medium text-gray-700">Relationship Path:</span>
                    <div className="mt-1 text-sm text-gray-600">
                      {(selectedField.includes('_') ? selectedField.split('_')[1] : selectedField).split('.').map((part, index, arr) => (
                        <span key={index}>
                          <code className="bg-gray-100 px-1 rounded">{part}</code>
                          {index < arr.length - 1 && (
                            <span className="mx-2 text-gray-400">references</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Click on a field above to view its details</p>
          </div>
        )}
      </div>
    </div>
  );
};