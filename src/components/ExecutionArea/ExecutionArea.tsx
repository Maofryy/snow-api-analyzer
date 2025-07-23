
import React, { useState, useEffect } from 'react';
import { TimelineView } from './Timeline/TimelineView';
import { TestCompletionModal } from './TestCompletionModal';
import { useBenchmark } from '../../contexts/BenchmarkContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Maximize2, Minimize2, Activity, Trophy } from 'lucide-react';

export function ExecutionArea() {
  const { state, dispatch } = useBenchmark();
  const { testResults, performanceMetrics, isRunning, completionModalDismissed } = state;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasShownCompletion, setHasShownCompletion] = useState(false);

  const handleTestSelect = (testId: string) => {
    // Handle test selection - could open details modal or navigate
    console.log('Selected test:', testId);
  };

  const handleExport = (data: any) => {
    // Handle timeline export
    console.log('Exporting timeline data:', data);
  };

  // Check if all tests are complete and show completion modal
  useEffect(() => {
    const allTestsFinished = !isRunning && testResults.length > 0;
    const shouldShowModal = allTestsFinished && !hasShownCompletion && !completionModalDismissed;

    if (shouldShowModal) {
      setHasShownCompletion(true);
      setTimeout(() => {
        setShowCompletionModal(true);
      }, 1500);
    }
  }, [isRunning, testResults, hasShownCompletion, completionModalDismissed]);

  // Reset completion state when new tests start
  useEffect(() => {
    if (isRunning && hasShownCompletion) {
      setHasShownCompletion(false);
    }
  }, [isRunning, hasShownCompletion]);

  return (
    <div className="space-y-6">
      <TestCompletionModal
        open={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          dispatch({ type: 'SET_COMPLETION_MODAL_DISMISSED', payload: true });
        }}
        testResults={testResults}
        performanceMetrics={performanceMetrics}
      />
      
      {/* Timeline View */}
      <TimelineView
        maxHeight={isExpanded ? '80vh' : '70vh'}
        onTestSelect={handleTestSelect}
        onExport={handleExport}
        autoScroll={true}
        showCompletionModal={showCompletionModal}
        onShowCompletionModal={() => setShowCompletionModal(true)}
        isExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded(!isExpanded)}
      />
    </div>
  );
}
