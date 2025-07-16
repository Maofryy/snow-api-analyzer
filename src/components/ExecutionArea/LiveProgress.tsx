import React, { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { useBenchmark } from "../../contexts/BenchmarkContext";
import { TestStatus } from "../../types";
import { ApiCallDetailsModal } from "./ApiCallDetailsModal";

export function LiveProgress() {
    const { state } = useBenchmark();
    const { testStatuses, isRunning } = state;
    const [selectedTest, setSelectedTest] = useState<TestStatus | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleTestClick = (testStatus: TestStatus) => {
        if (testStatus.restApiCall || testStatus.graphqlApiCall) {
            setSelectedTest(testStatus);
            setIsModalOpen(true);
        }
    };

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
            <Card className="p-6">
                <h3 className="text-lg font-semibold font-mono mb-4">Live Test Progress</h3>
                <div className="space-y-4">
                    {testStatuses.map((status) => {
                        if (typeof status !== "object" || status === null) return null;
                        return (
                            <div key={status.id} className={`space-y-2 p-3 rounded-md transition-colors ${status.restApiCall || status.graphqlApiCall ? "border border-gray-200" : ""}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`status-dot ${
                                                status.status === "running"
                                                    ? "status-running"
                                                    : status.status === "completed"
                                                    ? "status-connected"
                                                    : status.status === "failed"
                                                    ? "status-disconnected"
                                                    : "status-pending"
                                            }`}
                                        ></div>
                                        <span className="font-mono text-sm font-medium">{status.testType}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {status.dataComparison && (
                                            <div className={`px-2 py-1 font-mono text-xs rounded border ${
                                                status.dataComparison.isEquivalent 
                                                    ? "bg-green-100 text-green-700 border-green-200" 
                                                    : "bg-red-100 text-red-700 border-red-200"
                                            }`}>
                                                {status.dataComparison.isEquivalent ? "✓" : "✗"} {status.dataComparison.dataConsistency}%
                                            </div>
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
                                                See Details
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-xs text-gray-500 uppercase">{status.status}</span>
                                    {status.status === "running" && <span className="font-mono text-xs text-info">{Math.round(status.progress)}%</span>}
                                </div>

                                <div className="relative group w-full">
                                    <Progress value={status.progress} className="h-2 transition-shadow group-hover:shadow-lg" />
                                </div>

                                {status.startTime && (
                                    <div className="text-xs font-mono text-gray-500">
                                        Started: {status.startTime instanceof Date ? status.startTime.toLocaleTimeString() : ""}
                                        {status.endTime && status.startTime instanceof Date && status.endTime instanceof Date && (
                                            <span className="ml-4">Duration: {Math.round((status.endTime.getTime() - status.startTime.getTime()) / 1000)}s</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </>
    );
}
