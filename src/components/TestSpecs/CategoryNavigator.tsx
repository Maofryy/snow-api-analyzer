import React from 'react';
import { CategoryInfo } from '../../services/testSpecsService';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronRight, BarChart3, Zap, Smartphone, Target, Rocket } from 'lucide-react';

interface CategoryNavigatorProps {
  categories: CategoryInfo[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export const CategoryNavigator: React.FC<CategoryNavigatorProps> = ({
  categories,
  selectedCategory,
  onCategorySelect
}) => {
  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'dotWalkingTests':
        return <Rocket className="h-5 w-5" />;
      case 'multiTableTests':
        return <BarChart3 className="h-5 w-5" />;
      case 'schemaTailoringTests':
        return <Smartphone className="h-5 w-5" />;
      case 'performanceScaleTests':
        return <Zap className="h-5 w-5" />;
      case 'realWorldScenarios':
        return <Target className="h-5 w-5" />;
      default:
        return null;
    }
  };
  
  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case 'dotWalkingTests':
        return 'border-l-purple-500 bg-purple-50';
      case 'multiTableTests':
        return 'border-l-blue-500 bg-blue-50';
      case 'schemaTailoringTests':
        return 'border-l-green-500 bg-green-50';
      case 'performanceScaleTests':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'realWorldScenarios':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Test Categories</h3>
        {selectedCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCategorySelect(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {categories.map(category => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
              selectedCategory === category.id 
                ? `${getCategoryColor(category.id)} ring-2 ring-blue-200` 
                : 'border-l-gray-200 hover:border-l-gray-300'
            }`}
            onClick={() => onCategorySelect(category.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedCategory === category.id 
                      ? 'bg-white' 
                      : 'bg-gray-100'
                  }`}>
                    {getCategoryIcon(category.id)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Category Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Overview</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Total Categories:</span>
            <span className="ml-1 font-medium">{categories.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Scenarios:</span>
            <span className="ml-1 font-medium">
              {categories.reduce((sum, cat) => sum + cat.count, 0)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2 text-sm">Category Types</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-gray-700">Relationship Performance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Query Efficiency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Data Optimization</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-700">Scale Testing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700">Real-world Usage</span>
          </div>
        </div>
      </div>
    </div>
  );
};