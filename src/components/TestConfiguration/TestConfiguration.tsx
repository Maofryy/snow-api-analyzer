
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TestCategoryPanel } from './TestCategoryPanel';
import { useBenchmark } from '../../contexts/BenchmarkContext';

export function TestConfiguration() {
  const { state, dispatch } = useBenchmark();
  const [openPanels, setOpenPanels] = useState<string[]>(['fieldSelectionTests']);

  const togglePanel = (panelKey: string) => {
    setOpenPanels(prev => 
      prev.includes(panelKey) 
        ? prev.filter(key => key !== panelKey)
        : [...prev, panelKey]
    );
  };

  const testCategories = [
    { key: 'fieldSelectionTests', title: 'Field Selection Tests' },
    { key: 'relationshipTests', title: 'Relationship Tests' },
    { key: 'filteringTests', title: 'Filtering Tests' },
    { key: 'paginationTests', title: 'Pagination Tests' },
  ];

  const enabledTests = testCategories.filter(category => 
    state.testConfiguration[category.key as keyof typeof state.testConfiguration].enabled
  );

  const handleRunTests = () => {
    if (!state.instance.connected) {
      console.log('ServiceNow instance not connected');
      return;
    }

    dispatch({ type: 'SET_RUNNING', payload: true });
    dispatch({ type: 'RESET_TESTS' });

    // Simulate test execution (replace with actual API calls)
    enabledTests.forEach((test, index) => {
      setTimeout(() => {
        dispatch({
          type: 'UPDATE_TEST_STATUS',
          payload: {
            id: test.key,
            testType: test.title,
            status: 'running',
            progress: 0,
            startTime: new Date(),
          },
        });

        // Simulate test completion
        setTimeout(() => {
          const mockResult = {
            id: test.key,
            testType: test.title,
            restApi: {
              responseTime: Math.random() * 1000 + 200,
              payloadSize: Math.random() * 50000 + 10000,
              requestCount: 1,
              success: true,
            },
            graphqlApi: {
              responseTime: Math.random() * 800 + 150,
              payloadSize: Math.random() * 30000 + 8000,
              requestCount: 1,
              success: true,
            },
            winner: Math.random() > 0.5 ? 'rest' : 'graphql' as 'rest' | 'graphql',
            timestamp: new Date(),
          };

          dispatch({ type: 'ADD_TEST_RESULT', payload: mockResult });
          dispatch({
            type: 'UPDATE_TEST_STATUS',
            payload: {
              id: test.key,
              testType: test.title,
              status: 'completed',
              progress: 100,
              endTime: new Date(),
            },
          });

          if (index === enabledTests.length - 1) {
            dispatch({ type: 'SET_RUNNING', payload: false });
          }
        }, 2000 + Math.random() * 3000);
      }, index * 500);
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold font-mono">Test Configuration</h2>
        <div className="flex space-x-2">
          <Button
            onClick={handleRunTests}
            disabled={state.isRunning || !state.instance.connected || enabledTests.length === 0}
            className="font-mono"
          >
            {state.isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {testCategories.map((category) => (
          <TestCategoryPanel
            key={category.key}
            title={category.title}
            testKey={category.key}
            isOpen={openPanels.includes(category.key)}
            onToggle={() => togglePanel(category.key)}
          />
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <div className="text-sm font-mono text-gray-600">
          <div>Enabled Tests: {enabledTests.length}</div>
          <div>Instance Status: {state.instance.connected ? '✓ Connected' : '✗ Disconnected'}</div>
        </div>
      </div>
    </Card>
  );
}
