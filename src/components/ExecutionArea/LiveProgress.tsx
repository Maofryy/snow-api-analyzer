import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, CheckCircle, XCircle, AlertCircle, Trophy } from "lucide-react";
import { useBenchmark } from "../../contexts/BenchmarkContext";
import { TestStatus } from "../../types";
import { ApiCallDetailsModal } from "./ApiCallDetailsModal";
import { TestCompletionModal } from "./TestCompletionModal";

export function LiveProgress() {
    const { state, dispatch } = useBenchmark();
    const { testStatuses, isRunning, testResults, performanceMetrics, completionModalDismissed } = state;
    const [selectedTest, setSelectedTest] = useState<TestStatus | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [hasShownCompletion, setHasShownCompletion] = useState(false);

    const handleTestClick = (testStatus: TestStatus) => {
        if (testStatus.restApiCall || testStatus.graphqlApiCall) {
            setSelectedTest(testStatus);
            setIsModalOpen(true);
        }
    };

    // Check if all tests are complete and show completion modal
    useEffect(() => {
        const completedTests = testStatuses.filter(status => status.status === 'completed');
        const failedTests = testStatuses.filter(status => status.status === 'failed');
        const allTestsFinished = testStatuses.length > 0 && 
                                !isRunning && 
                                (completedTests.length + failedTests.length) === testStatuses.length;
        
        const hasValidResults = testResults.length > 0 && 
                               testResults.length === completedTests.length; // Only count successful tests in results

        const allTestsCompleted = allTestsFinished && hasValidResults && !hasShownCompletion && !completionModalDismissed;

        if (allTestsCompleted) {
            setHasShownCompletion(true);
            // Small delay to let the UI settle and ensure all data is updated
            setTimeout(() => {
                setShowCompletionModal(true);
            }, 1500);
        }
    }, [testStatuses, isRunning, testResults, hasShownCompletion, completionModalDismissed]);

    // Reset completion state when new tests start
    useEffect(() => {
        if (isRunning && hasShownCompletion) {
            setHasShownCompletion(false);
        }
    }, [isRunning, hasShownCompletion]);

    if (!isRunning && testStatuses.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center text-gray-500 font-mono">
                    <p>No tests running</p>
                    <p className="text-sm mt-2">Configure and run tests to see live progress</p>
                </div>
            </Card>
        );
    }

    return (
        <>
            <ApiCallDetailsModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                restApiCall={selectedTest?.restApiCall}
                graphqlApiCall={selectedTest?.graphqlApiCall}
                dataComparison={selectedTest?.dataComparison}
            />
            <TestCompletionModal
                open={showCompletionModal}
                onClose={() => {
                    setShowCompletionModal(false);
                    dispatch({ type: 'SET_COMPLETION_MODAL_DISMISSED', payload: true });
                }}
                testResults={testResults}
                performanceMetrics={performanceMetrics}
            />
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold font-mono">Test Execution Status</h3>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-sm font-mono text-gray-600">
                            <span>{testStatuses.filter(s => s.status === 'completed').length} completed</span>
                            <span>•</span>
                            <span>{testStatuses.filter(s => s.status === 'running').length} running</span>
                            <span>•</span>
                            <span>{testStatuses.filter(s => s.status === 'failed').length} failed</span>
                        </div>
                        {/* Show results button when tests have been completed previously */}
                        {!isRunning && testResults.length > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowCompletionModal(true)}
                                className="text-xs"
                            >
                                <Trophy className="w-3 h-3 mr-1" />
                                View Results
                            </Button>
                        )}
                    </div>
                </div>
                <div className="space-y-4">
                    {testStatuses.map((status) => {
                        if (typeof status !== "object" || status === null) return null;
                        return (
                            <div key={status.id} className={`space-y-3 p-4 rounded-lg border transition-all hover:shadow-md ${
                                status.status === "completed" ? "border-green-200 bg-green-50" :
                                status.status === "failed" ? "border-red-200 bg-red-50" :
                                status.status === "running" ? "border-blue-200 bg-blue-50" :
                                "border-gray-200 bg-gray-50"
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                            {status.status === "running" && <Clock className="w-4 h-4 text-blue-600 animate-spin" />}
                                            {status.status === "completed" && <CheckCircle className="w-4 h-4 text-green-600" />}
                                            {status.status === "failed" && <XCircle className="w-4 h-4 text-red-600" />}
                                            {status.status === "pending" && <AlertCircle className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-mono text-sm font-medium">{status.testType}</span>
                                            <span className="font-mono text-xs text-gray-500 uppercase">{status.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {status.dataComparison && (
                                            <Badge variant={status.dataComparison.isEquivalent ? "default" : status.dataComparison.onlyKnownIssues ? "secondary" : "destructive"}>
                                                {status.dataComparison.isEquivalent ? "✓" : 
                                                 status.dataComparison.onlyKnownIssues ? "⚠" : "✗"} {status.dataComparison.dataConsistency}%
                                            </Badge>
                                        )}
                                        {(status.restApiCall || status.graphqlApiCall) && (
                                            <button
                                                className="px-3 py-1 font-mono text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTestClick(status);
                                                }}
                                                type="button"
                                            >
                                                Details
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="relative group w-full">
                                    <Progress value={status.progress} className="h-3 transition-shadow group-hover:shadow-lg [&>div]:bg-blue-500" />
                                    {status.status === "running" && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="font-mono text-xs text-gray-700 font-medium">{Math.round(status.progress)}%</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-600">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {status.status === "completed" && status.endTime ? (
                                                `Completed: ${new Date(status.endTime).toLocaleTimeString()}`
                                            ) : status.status === "failed" && status.endTime ? (
                                                `Failed: ${new Date(status.endTime).toLocaleTimeString()}`
                                            ) : status.startTime ? (
                                                `Started: ${new Date(status.startTime).toLocaleTimeString()}`
                                            ) : (
                                                "Not started"
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Zap className="w-3 h-3" />
                                        <span>
                                            {status.endTime && status.startTime ? (
                                                `Duration: ${Math.round((new Date(status.endTime).getTime() - new Date(status.startTime).getTime()) / 1000)}s`
                                            ) : status.status === "running" && status.startTime ? (
                                                `Running for ${Math.round((Date.now() - new Date(status.startTime).getTime()) / 1000)}s`
                                            ) : status.status === "running" ? (
                                                "Starting..."
                                            ) : status.status === "completed" ? (
                                                "Completed"
                                            ) : status.status === "failed" ? (
                                                "Failed"
                                            ) : (
                                                "Pending"
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </>
    );
}
