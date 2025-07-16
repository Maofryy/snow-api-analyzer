import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Save, TestTube, Eye, AlertTriangle, Plus, X } from 'lucide-react';
import { CustomRequest, ValidationError, GraphQLFieldStructure } from '../../types';
import { useBenchmark } from '../../contexts/BenchmarkContext';
import { validateCustomRequest, buildCustomRestUrl, buildCustomGraphQLQuery } from '../../utils/apiBuilders';
import { compareApiResponses } from '../../utils/dataComparison';
import { makeAuthenticatedRequest, isAuthError, getAuthErrorMessage } from '../../services/authService';
import { 
  getAvailableTableNames, 
  getTableDisplayName, 
  getCommonTableFields, 
  getReferenceTableFields, 
  getDefaultTableFields,
  getTableDescription 
} from '../../utils/serviceNowFieldMappings';

interface RequestBuilderProps {
  request?: CustomRequest;
  onSave: (request: CustomRequest) => void;
  onCancel: () => void;
}

const commonTables = getAvailableTableNames();

export function RequestBuilder({ request, onSave, onCancel }: RequestBuilderProps) {
  const { state, dispatch } = useBenchmark();
  const getInitialFormData = () => {
    const defaultTable = 'incident';
    const defaultFields = getDefaultTableFields(defaultTable);
    
    return {
      name: '',
      description: '',
      table: defaultTable,
      restConfig: {
        fields: defaultFields,
        filters: '',
        orderBy: 'sys_created_on',
        limit: 100
      },
      graphqlConfig: {
        fields: defaultFields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as GraphQLFieldStructure),
        filters: '',
        orderBy: 'sys_created_on',
        limit: 100
      },
      tags: []
    };
  };

  const [formData, setFormData] = useState<Partial<CustomRequest>>(getInitialFormData());

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [previewData, setPreviewData] = useState<{
    restUrl?: string;
    graphqlQuery?: string;
    errors?: ValidationError[];
  }>({});
  const [newTag, setNewTag] = useState('');
  const [newCustomField, setNewCustomField] = useState('');
  const [isTestingRequest, setIsTestingRequest] = useState(false);
  const [testResult, setTestResult] = useState<{
    restResult?: any;
    graphqlResult?: any;
    error?: string;
  }>({});

  useEffect(() => {
    if (request) {
      setFormData(request);
    } else {
      // Reset form when no request is provided (creating new)
      setFormData(getInitialFormData());
    }
  }, [request]);

  useEffect(() => {
    // Generate preview when form data changes
    if (formData.table && formData.restConfig && formData.graphqlConfig) {
      try {
        const tempRequest = formData as CustomRequest;
        const restResult = buildCustomRestUrl(tempRequest);
        const graphqlResult = buildCustomGraphQLQuery(tempRequest);
        
        setPreviewData({
          restUrl: restResult.url,
          graphqlQuery: graphqlResult.query,
          errors: [...restResult.errors, ...graphqlResult.errors]
        });
      } catch (error) {
        setPreviewData({
          errors: [{ field: 'preview', message: 'Error generating preview' }]
        });
      }
    }
  }, [formData]);

  const handleSave = () => {
    const errors = validateCustomRequest(formData);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const savedRequest: CustomRequest = {
      id: request?.id || crypto.randomUUID(),
      name: formData.name!,
      description: formData.description,
      table: formData.table!,
      restConfig: formData.restConfig!,
      graphqlConfig: formData.graphqlConfig!,
      tags: formData.tags,
      createdAt: request?.createdAt || new Date(),
      updatedAt: new Date()
    };

    onSave(savedRequest);
    setValidationErrors([]);
  };

  const handleFieldChange = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      restConfig: {
        ...prev.restConfig!,
        fields: checked 
          ? [...prev.restConfig!.fields, field]
          : prev.restConfig!.fields.filter(f => f !== field)
      },
      graphqlConfig: {
        ...prev.graphqlConfig!,
        fields: {
          ...prev.graphqlConfig!.fields,
          [field]: checked
        }
      }
    }));
  };

  const handleCustomFieldAdd = (fieldName: string) => {
    if (fieldName.trim() && !formData.restConfig!.fields.includes(fieldName)) {
      handleFieldChange(fieldName, true);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove)
    }));
  };

  const loadTableFields = (table: string) => {
    return getCommonTableFields(table);
  };

  const handleTableChange = (newTable: string) => {
    const defaultFields = getDefaultTableFields(newTable);
    setFormData(prev => ({
      ...prev,
      table: newTable,
      restConfig: {
        ...prev.restConfig!,
        fields: defaultFields
      },
      graphqlConfig: {
        ...prev.graphqlConfig!,
        fields: defaultFields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as GraphQLFieldStructure)
      }
    }));
  };

  const availableFields = loadTableFields(formData.table!);

  const handleTestRequest = async () => {
    if (!formData.name || !formData.table || !formData.restConfig || !formData.graphqlConfig) {
      setValidationErrors([{ field: 'form', message: 'Please fill in all required fields' }]);
      return;
    }

    const errors = validateCustomRequest(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsTestingRequest(true);
    setTestResult({});

    try {
      const tempRequest: CustomRequest = {
        id: 'test-request',
        name: formData.name,
        description: formData.description,
        table: formData.table,
        restConfig: formData.restConfig,
        graphqlConfig: formData.graphqlConfig,
        tags: formData.tags,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Build REST URL
      const restResult = buildCustomRestUrl(tempRequest);
      if (restResult.errors.length > 0) {
        throw new Error(`REST URL validation errors: ${restResult.errors.map(e => e.message).join(', ')}`);
      }

      // Build GraphQL query
      const gqlResult = buildCustomGraphQLQuery(tempRequest);
      if (gqlResult.errors.length > 0) {
        throw new Error(`GraphQL query validation errors: ${gqlResult.errors.map(e => e.message).join(', ')}`);
      }

      const restEndpoint = restResult.url;
      const restOptions = {
        method: 'GET'
      };

      const gqlEndpoint = 'api/now/graphql';
      const gqlOptions = {
        method: 'POST',
        body: JSON.stringify({ query: gqlResult.query })
      };

      // Execute REST call
      const restResponse = await makeAuthenticatedRequest(restEndpoint, restOptions, state.instance);
      const restData = await restResponse.json();

      // Execute GraphQL call
      const gqlResponse = await makeAuthenticatedRequest(gqlEndpoint, gqlOptions, state.instance);
      const gqlData = await gqlResponse.json();

      setTestResult({
        restResult: restData,
        graphqlResult: gqlData
      });

    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      
      if (isAuthError(error)) {
        errorMessage = getAuthErrorMessage(error);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setTestResult({
        error: errorMessage
      });
    } finally {
      setIsTestingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {request ? 'Edit Custom Request' : 'Create New Custom Request'}
        </h3>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Request
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index} className="text-sm">
                  <strong>{error.field}:</strong> {error.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Request Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., High Priority Incidents"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this request tests"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="table">Table *</Label>
                <Select
                  value={formData.table}
                  onValueChange={handleTableChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonTables.map(table => (
                      <SelectItem key={table} value={table}>
                        {getTableDisplayName(table)} ({table})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.table && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTableDescription(formData.table)}
                  </p>
                )}
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer">
                        {tag}
                        <X 
                          className="h-3 w-3 ml-1" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Field Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Common Fields</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {availableFields.map(field => (
                    <label key={field} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.restConfig!.fields.includes(field)}
                        onChange={(e) => handleFieldChange(field, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">{field}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Reference Fields (Dot-Walking)</Label>
                <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {getReferenceTableFields(formData.table!).map(field => (
                    <label key={field} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.restConfig!.fields.includes(field)}
                        onChange={(e) => handleFieldChange(field, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-mono">{field}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Add Custom Field</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., caller_id.department.name"
                    value={newCustomField}
                    onChange={(e) => setNewCustomField(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCustomFieldAdd(newCustomField);
                        setNewCustomField('');
                      }
                    }}
                  />
                  <Button 
                    onClick={() => {
                      handleCustomFieldAdd(newCustomField);
                      setNewCustomField('');
                    }} 
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Selected Fields ({formData.restConfig!.fields.length})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.restConfig!.fields.map(field => (
                    <Badge key={field} variant="default">
                      {field}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => handleFieldChange(field, false)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Query Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="filters">Filters</Label>
                <Input
                  id="filters"
                  value={formData.restConfig!.filters}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    restConfig: { ...prev.restConfig!, filters: e.target.value },
                    graphqlConfig: { ...prev.graphqlConfig!, filters: e.target.value }
                  }))}
                  placeholder="e.g., state=1^priority<=2"
                />
              </div>

              <div>
                <Label htmlFor="orderBy">Order By</Label>
                <Input
                  id="orderBy"
                  value={formData.restConfig!.orderBy}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    restConfig: { ...prev.restConfig!, orderBy: e.target.value },
                    graphqlConfig: { ...prev.graphqlConfig!, orderBy: e.target.value }
                  }))}
                  placeholder="e.g., sys_created_on"
                />
              </div>

              <div>
                <Label htmlFor="limit">Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  value={formData.restConfig!.limit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    restConfig: { ...prev.restConfig!, limit: parseInt(e.target.value) || 100 },
                    graphqlConfig: { ...prev.graphqlConfig!, limit: parseInt(e.target.value) || 100 }
                  }))}
                  min="1"
                  max="10000"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Request Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewData.errors && previewData.errors.length > 0 && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {previewData.errors.map((error, index) => (
                        <div key={index} className="text-sm">
                          <strong>{error.field}:</strong> {error.message}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="rest" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rest">REST API</TabsTrigger>
                  <TabsTrigger value="graphql">GraphQL</TabsTrigger>
                </TabsList>

                <TabsContent value="rest" className="space-y-4">
                  <div>
                    <Label>Generated REST URL</Label>
                    <Textarea
                      value={previewData.restUrl || ''}
                      readOnly
                      className="mt-2 font-mono text-sm"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="graphql" className="space-y-4">
                  <div>
                    <Label>Generated GraphQL Query</Label>
                    <Textarea
                      value={previewData.graphqlQuery || ''}
                      readOnly
                      className="mt-2 font-mono text-sm"
                      rows={8}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Test Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full" 
                disabled={validationErrors.length > 0 || !state.instance.connected || isTestingRequest}
                onClick={handleTestRequest}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingRequest ? 'Testing...' : 'Test Request Now'}
              </Button>
              {!state.instance.connected && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Connect to ServiceNow instance to test
                </p>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {(testResult.restResult || testResult.graphqlResult || testResult.error) && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                {testResult.error ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error:</strong> {testResult.error}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Tabs defaultValue="rest" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="rest">REST Response</TabsTrigger>
                      <TabsTrigger value="graphql">GraphQL Response</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rest" className="space-y-4">
                      <div>
                        <Label>REST API Response</Label>
                        <Textarea
                          value={JSON.stringify(testResult.restResult, null, 2)}
                          readOnly
                          className="mt-2 font-mono text-sm"
                          rows={8}
                        />
                        {testResult.restResult?.result && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Records returned: {testResult.restResult.result.length}
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="graphql" className="space-y-4">
                      <div>
                        <Label>GraphQL Response</Label>
                        <Textarea
                          value={JSON.stringify(testResult.graphqlResult, null, 2)}
                          readOnly
                          className="mt-2 font-mono text-sm"
                          rows={8}
                        />
                        {testResult.graphqlResult?.data && (
                          <p className="text-sm text-muted-foreground mt-2">
                            GraphQL data structure returned successfully
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}