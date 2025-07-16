import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Trash2, Edit, Copy, Plus, Search, Download, Upload } from 'lucide-react';
import { CustomRequest, ValidationError } from '../../types';
import { useBenchmark } from '../../contexts/BenchmarkContext';
import { validateCustomRequest } from '../../utils/apiBuilders';
import { Alert, AlertDescription } from '../ui/alert';

interface CustomRequestManagerProps {
  onEditRequest: (request: CustomRequest) => void;
  onCreateNew: () => void;
}

export function CustomRequestManager({ onEditRequest, onCreateNew }: CustomRequestManagerProps) {
  const { state, dispatch } = useBenchmark();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const filteredRequests = state.customRequests.filter(request => {
    const matchesSearch = request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.table.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(tag => request.tags?.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(new Set(state.customRequests.flatMap(req => req.tags || [])));

  const handleDeleteRequest = (requestId: string) => {
    if (window.confirm('Are you sure you want to delete this custom request?')) {
      dispatch({ type: 'DELETE_CUSTOM_REQUEST', payload: requestId });
    }
  };

  const handleDuplicateRequest = (request: CustomRequest) => {
    const duplicatedRequest: CustomRequest = {
      ...request,
      id: crypto.randomUUID(),
      name: `${request.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const errors = validateCustomRequest(duplicatedRequest);
    if (errors.length === 0) {
      dispatch({ type: 'ADD_CUSTOM_REQUEST', payload: duplicatedRequest });
    } else {
      setValidationErrors(errors);
    }
  };

  const handleExportRequests = () => {
    const dataStr = JSON.stringify(state.customRequests, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'custom-requests-export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportRequests = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedRequests = JSON.parse(e.target?.result as string) as CustomRequest[];
        
        // Validate imported requests
        const errors: ValidationError[] = [];
        importedRequests.forEach((request, index) => {
          const requestErrors = validateCustomRequest(request);
          if (requestErrors.length > 0) {
            errors.push(...requestErrors.map(err => ({
              ...err,
              field: `Request ${index + 1}: ${err.field}`
            })));
          }
        });

        if (errors.length > 0) {
          setValidationErrors(errors);
          return;
        }

        // Add imported requests with new IDs
        importedRequests.forEach(request => {
          const newRequest: CustomRequest = {
            ...request,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          dispatch({ type: 'ADD_CUSTOM_REQUEST', payload: newRequest });
        });

        alert(`Successfully imported ${importedRequests.length} custom requests`);
      } catch (error) {
        setValidationErrors([{ field: 'import', message: 'Invalid JSON file format' }]);
      }
    };
    reader.readAsText(file);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Custom Request Library</h3>
          <p className="text-sm text-muted-foreground">
            Manage your custom REST and GraphQL requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreateNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
          <Button onClick={handleExportRequests} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImportRequests}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert>
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

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search Requests</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name, description, or table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div>
            <Label>Filter by Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">
                {state.customRequests.length === 0 
                  ? "No custom requests created yet" 
                  : "No requests match your current filters"}
              </p>
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{request.name}</CardTitle>
                    {request.description && (
                      <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditRequest(request)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDuplicateRequest(request)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteRequest(request.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span><strong>Table:</strong> {request.table}</span>
                    <span><strong>REST Fields:</strong> {request.restConfig.fields.length}</span>
                    <span><strong>Limit:</strong> {request.restConfig.limit || 'Default'}</span>
                  </div>
                  
                  {request.restConfig.filters && (
                    <div className="text-sm">
                      <strong>Filters:</strong> 
                      <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                        {request.restConfig.filters}
                      </code>
                    </div>
                  )}
                  
                  {request.tags && request.tags.length > 0 && (
                    <div className="flex gap-2">
                      {request.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(request.createdAt).toLocaleDateString()} | 
                    Updated: {new Date(request.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}