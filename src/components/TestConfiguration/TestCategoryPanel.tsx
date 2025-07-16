import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MultiSelect } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useBenchmark } from '../../contexts/BenchmarkContext';
import { testSpecs } from '../../specs/testSpecs';

interface TestCategoryPanelProps {
  title: string;
  testKey: string;
  isOpen: boolean;
  onToggle: () => void;
  description?: string;
}

export function TestCategoryPanel({ title, testKey, isOpen, onToggle, description }: TestCategoryPanelProps) {
  const { state, dispatch } = useBenchmark();
  const testConfig = state.testConfiguration[testKey as keyof typeof state.testConfiguration];

  const updateTestConfig = (updates: Record<string, unknown>) => {
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

  const updateParameters = (paramUpdates: Record<string, unknown>) => {
    updateTestConfig({
      parameters: {
        ...testConfig.parameters,
        ...paramUpdates,
      },
    });
  };

  const renderParameterControls = () => {
    switch (testKey) {
      case 'dotWalkingTests': {
        // Get all dot-walking test variants and their record limits
        const variants = Object.keys(testSpecs.dotWalkingTests);
        const variantOptions = variants.map(variant => ({ label: variant, value: variant }));
        
        // Get record limits from first variant (they should be similar)
        const firstVariant = testSpecs.dotWalkingTests[variants[0] as keyof typeof testSpecs.dotWalkingTests];
        const limits = firstVariant?.recordLimits || [25, 50, 100];
        
        return (
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-sm">Test Variants</Label>
              <div className="my-2">
                <MultiSelect
                  options={variantOptions}
                  defaultValue={testConfig.selectedVariants || variants}
                  onValueChange={vals => updateTestConfig({ selectedVariants: vals })}
                  placeholder="Select test variants..."
                />
              </div>
            </div>
            <div>
              <Label className="font-mono text-sm">Record Limits</Label>
              <div className="my-2">
                <MultiSelect
                  options={limits.map(lim => ({ label: String(lim), value: String(lim) }))}
                  defaultValue={(testConfig.selectedLimits || limits).map(String)}
                  onValueChange={vals => updateTestConfig({ selectedLimits: vals.map(Number) })}
                  placeholder="Select record limits..."
                />
              </div>
            </div>
          </div>
        );
      }
      
      case 'multiTableTests': {
        const variants = Object.keys(testSpecs.multiTableTests);
        const variantOptions = variants.map(variant => ({ label: variant, value: variant }));
        
        const firstVariant = testSpecs.multiTableTests[variants[0] as keyof typeof testSpecs.multiTableTests];
        const limits = firstVariant?.recordLimits || [25, 50];
        
        return (
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-sm">Multi-Table Scenarios</Label>
              <div className="my-2">
                <MultiSelect
                  options={variantOptions}
                  defaultValue={testConfig.selectedVariants || variants}
                  onValueChange={vals => updateTestConfig({ selectedVariants: vals })}
                  placeholder="Select scenarios..."
                />
              </div>
            </div>
            <div>
              <Label className="font-mono text-sm">Record Limits per Table</Label>
              <div className="my-2">
                <MultiSelect
                  options={limits.map(lim => ({ label: String(lim), value: String(lim) }))}
                  defaultValue={(testConfig.selectedLimits || limits).map(String)}
                  onValueChange={vals => updateTestConfig({ selectedLimits: vals.map(Number) })}
                  placeholder="Select record limits..."
                />
              </div>
            </div>
          </div>
        );
      }
      
      case 'schemaTailoringTests': {
        const variants = Object.keys(testSpecs.schemaTailoringTests);
        const variantOptions = variants.map(variant => ({ label: variant, value: variant }));
        
        const firstVariant = testSpecs.schemaTailoringTests[variants[0] as keyof typeof testSpecs.schemaTailoringTests];
        const limits = firstVariant?.recordLimits || [50, 100, 200];
        
        return (
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-sm">Schema Scenarios</Label>
              <div className="my-2">
                <MultiSelect
                  options={variantOptions}
                  defaultValue={testConfig.selectedVariants || variants}
                  onValueChange={vals => updateTestConfig({ selectedVariants: vals })}
                  placeholder="Select schema scenarios..."
                />
              </div>
            </div>
            <div>
              <Label className="font-mono text-sm">Record Limits</Label>
              <div className="my-2">
                <MultiSelect
                  options={limits.map(lim => ({ label: String(lim), value: String(lim) }))}
                  defaultValue={(testConfig.selectedLimits || limits).map(String)}
                  onValueChange={vals => updateTestConfig({ selectedLimits: vals.map(Number) })}
                  placeholder="Select record limits..."
                />
              </div>
            </div>
          </div>
        );
      }
      
      case 'performanceScaleTests': {
        const variants = Object.keys(testSpecs.performanceScaleTests);
        const variantOptions = variants.map(variant => ({ label: variant, value: variant }));
        
        const firstVariant = testSpecs.performanceScaleTests[variants[0] as keyof typeof testSpecs.performanceScaleTests];
        const limits = firstVariant?.recordLimits || [500, 1000, 2500];
        
        return (
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-sm">Performance Scenarios</Label>
              <div className="my-2">
                <MultiSelect
                  options={variantOptions}
                  defaultValue={testConfig.selectedVariants || variants}
                  onValueChange={vals => updateTestConfig({ selectedVariants: vals })}
                  placeholder="Select performance scenarios..."
                />
              </div>
            </div>
            <div>
              <Label className="font-mono text-sm">High-Volume Record Limits</Label>
              <div className="my-2">
                <MultiSelect
                  options={limits.map(lim => ({ label: String(lim), value: String(lim) }))}
                  defaultValue={(testConfig.selectedLimits || limits).map(String)}
                  onValueChange={vals => updateTestConfig({ selectedLimits: vals.map(Number) })}
                  placeholder="Select record limits..."
                />
              </div>
            </div>
          </div>
        );
      }
      
      case 'realWorldScenarios': {
        const variants = Object.keys(testSpecs.realWorldScenarios);
        const variantOptions = variants.map(variant => ({ label: variant, value: variant }));
        
        return (
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-sm">Real-World Use Cases</Label>
              <div className="my-2">
                <MultiSelect
                  options={variantOptions}
                  defaultValue={testConfig.selectedVariants || variants}
                  onValueChange={vals => updateTestConfig({ selectedVariants: vals })}
                  placeholder="Select use cases..."
                />
              </div>
            </div>
            <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded">
              💡 These tests simulate real developer scenarios like loading incident detail pages and notification contexts.
            </div>
          </div>
        );
      }
      
      default:
        return (
          <div className="text-sm text-gray-500 p-3">
            No configuration options available for this test category.
          </div>
        );
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border border-gray-200 rounded-lg bg-white">
        <CollapsibleTrigger asChild>
          <div
            className="w-full justify-between p-4 h-auto font-mono hover:bg-gray-50 cursor-pointer flex items-center"
            tabIndex={0}
            role="button"
            aria-expanded={isOpen}
          >
            <div className="flex items-center space-x-3 flex-1">
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={testConfig.enabled}
                  onCheckedChange={(enabled) => updateTestConfig({ enabled })}
                />
              </div>
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                {description && (
                  <div className="text-sm text-gray-600 font-normal">{description}</div>
                )}
              </div>
              {testConfig.enabled && (
                <span className="bg-success/20 text-success-dark px-2 py-1 rounded text-xs">
                  ENABLED
                </span>
              )}
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
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
