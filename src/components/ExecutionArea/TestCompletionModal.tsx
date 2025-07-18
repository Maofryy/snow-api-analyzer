import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, TrendingUp, TrendingDown, Clock, Database, Zap, CheckCircle, Download, Share2, X, Minus } from "lucide-react";
import { TestResult, PerformanceMetrics } from "../../types";

interface TestCompletionModalProps {
    open: boolean;
    onClose: () => void;
    testResults: TestResult[];
    performanceMetrics: PerformanceMetrics;
}

interface CategorySummary {
    category: string;
    icon: string;
    restWins: number;
    graphqlWins: number;
    totalTests: number;
    avgPerformanceImprovement: number;
    bestScenario: string;
}

export function TestCompletionModal({ open, onClose, testResults, performanceMetrics }: TestCompletionModalProps) {
    const [showConfetti, setShowConfetti] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Calculate metrics from testResults if performanceMetrics is empty/zero
    const calculatedMetrics = React.useMemo(() => {
        if (performanceMetrics.totalTests > 0) {
            return performanceMetrics;
        }
        // Calculate from testResults
        const restWins = testResults.filter((r) => r.winner === "rest").length;
        const graphqlWins = testResults.filter((r) => r.winner === "graphql").length;
        const totalTests = testResults.length;

        const totalRestTime = testResults.reduce((sum, r) => sum + r.restApi.responseTime, 0);
        const totalGraphqlTime = testResults.reduce((sum, r) => sum + r.graphqlApi.responseTime, 0);
        const totalRestPayload = testResults.reduce((sum, r) => sum + r.restApi.payloadSize, 0);
        const totalGraphqlPayload = testResults.reduce((sum, r) => sum + r.graphqlApi.payloadSize, 0);

        return {
            restWins,
            graphqlWins,
            totalTests,
            averageRestResponseTime: totalTests > 0 ? totalRestTime / totalTests : 0,
            averageGraphqlResponseTime: totalTests > 0 ? totalGraphqlTime / totalTests : 0,
            totalRestPayloadSize: totalRestPayload,
            totalGraphqlPayloadSize: totalGraphqlPayload,
            successRate: totalTests > 0 ? ((restWins + graphqlWins) / totalTests) * 100 : 0,
        };
    }, [testResults, performanceMetrics]);

    const triggerConfetti = () => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: NodeJS.Timeout = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            });
        }, 250);
    };

    useEffect(() => {
        if (open && !showConfetti) {
            setShowConfetti(true);
            setTimeout(() => {
                triggerConfetti();
            }, 500);
        }
    }, [open, showConfetti]);

    const overallWinner = calculatedMetrics.restWins > calculatedMetrics.graphqlWins ? "REST" : calculatedMetrics.graphqlWins > calculatedMetrics.restWins ? "GraphQL" : "TIE";

    const getCategorySummaries = (): CategorySummary[] => {
        const categories = new Map<
            string,
            {
                restWins: number;
                graphqlWins: number;
                totalTests: number;
                performanceGains: number[];
                scenarios: Map<string, number>;
            }
        >();


        testResults.forEach((result, index) => {

            // Parse the actual format: "dotWalkingTests-complexTraversal-full_context-25"
            // Format: categoryKey-subCategory-variant-recordCount
            const parts = result.testType.split("-");

            if (parts.length < 4) {
                return;
            }

            const categoryKey = parts[0]; // e.g., "dotWalkingTests"
            const subCategory = parts[1]; // e.g., "complexTraversal"
            const variant = parts[2]; // e.g., "full_context"
            const recordCount = parts[3]; // e.g., "25"


            // Map category keys to display names
            const categoryDisplayNames: Record<string, string> = {
                dotWalkingTests: "Dot-Walking Performance",
                multiTableTests: "Multi-Table Queries",
                schemaTailoringTests: "Schema Tailoring",
                performanceScaleTests: "Performance at Scale",
                realWorldScenarios: "Real-World Scenarios",
            };

            const categoryDisplayName = categoryDisplayNames[categoryKey] || categoryKey;
            const variantDisplayName = variant.replace(/_/g, " "); // Convert underscores to spaces

            // Use the cleaned display name (no emojis needed since we're mapping from keys)
            const category = categoryDisplayName.trim();

            if (!category) {
                return;
            }

            if (!categories.has(category)) {
                categories.set(category, {
                    restWins: 0,
                    graphqlWins: 0,
                    totalTests: 0,
                    performanceGains: [],
                    scenarios: new Map(),
                });
            }

            const cat = categories.get(category)!;
            cat.totalTests++;

            if (result.winner === "rest") cat.restWins++;
            if (result.winner === "graphql") cat.graphqlWins++;

            // Calculate performance improvement
            const faster = result.winner === "rest" ? result.restApi.responseTime : result.graphqlApi.responseTime;
            const slower = result.winner === "rest" ? result.graphqlApi.responseTime : result.restApi.responseTime;
            const improvement = ((slower - faster) / slower) * 100;
            cat.performanceGains.push(improvement);

            // Track scenarios
            cat.scenarios.set(result.testType, (cat.scenarios.get(result.testType) || 0) + 1);
        });

        const categoryIcons: Record<string, string> = {
            "Dot-Walking Performance": "🚀",
            "Multi-Table Queries": "📊",
            "Schema Tailoring": "📱",
            "Performance at Scale": "⚡",
            "Real-World Scenarios": "🌟",
        };

        return Array.from(categories.entries()).map(([category, data]) => ({
            category,
            icon: categoryIcons[category] || "📋",
            restWins: data.restWins,
            graphqlWins: data.graphqlWins,
            totalTests: data.totalTests,
            avgPerformanceImprovement: data.performanceGains.length > 0 ? data.performanceGains.reduce((a, b) => a + b, 0) / data.performanceGains.length : 0,
            bestScenario: Array.from(data.scenarios.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
        }));
    };

    const categorySummaries = getCategorySummaries();


    const handleExportResults = () => {
        const exportData = {
            summary: {
                overallWinner,
                totalTests: calculatedMetrics.totalTests,
                restWins: calculatedMetrics.restWins,
                graphqlWins: calculatedMetrics.graphqlWins,
                averageRestTime: calculatedMetrics.averageRestResponseTime,
                averageGraphqlTime: calculatedMetrics.averageGraphqlResponseTime,
            },
            categorySummaries,
            detailedResults: testResults,
            generatedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `benchmark-results-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleShareResults = async () => {
        const resultsText = `🏆 ServiceNow API Benchmark Results\n\nOverall Winner: ${overallWinner}\nTotal Tests: ${calculatedMetrics.totalTests}\nREST Wins: ${
            calculatedMetrics.restWins
        }\nGraphQL Wins: ${calculatedMetrics.graphqlWins}\n\nAvg Response Times:\n• REST: ${calculatedMetrics.averageRestResponseTime.toFixed(
            2
        )}ms\n• GraphQL: ${calculatedMetrics.averageGraphqlResponseTime.toFixed(2)}ms`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "ServiceNow API Benchmark Results",
                    text: resultsText,
                });
            } catch (err) {
                navigator.clipboard.writeText(resultsText);
            }
        } else {
            navigator.clipboard.writeText(resultsText);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-center space-x-3 text-2xl font-bold">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        <span>Benchmark Complete!</span>
                        <Trophy className="w-8 h-8 text-yellow-500" />
                    </DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground">
                        View detailed results and performance metrics from your API benchmark test
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Winner Announcement */}
                    <Card
                        className={`p-6 text-center ${
                            overallWinner === "REST" ? "bg-blue-50 border-blue-200" : overallWinner === "GraphQL" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                        }`}
                    >
                        <div className="flex items-center justify-center space-x-4 mb-4">
                            <Medal className={`w-12 h-12 ${overallWinner === "REST" ? "text-blue-600" : overallWinner === "GraphQL" ? "text-green-600" : "text-gray-600"}`} />
                            <div>
                                <h2 className="text-3xl font-bold font-mono">
                                    {overallWinner === "TIE" ? "IT'S A TIE!" : `${overallWinner} WINS!`}
                                </h2>
                                <p className="text-lg text-gray-600">{calculatedMetrics.totalTests} tests completed</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{calculatedMetrics.restWins}</div>
                                <div className="text-sm text-gray-600">REST Wins</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{calculatedMetrics.graphqlWins}</div>
                                <div className="text-sm text-gray-600">GraphQL Wins</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-600">
                                    {calculatedMetrics.totalTests > 0 ? ((Math.max(calculatedMetrics.restWins, calculatedMetrics.graphqlWins) / calculatedMetrics.totalTests) * 100).toFixed(1) : 0}%
                                </div>
                                <div className="text-sm text-gray-600">Win Rate</div>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                            <div className="text-lg font-bold">{calculatedMetrics.averageRestResponseTime.toFixed(0)}ms</div>
                            <div className="text-xs text-gray-600">Avg REST Time</div>
                        </Card>
                        <Card className="p-4 text-center">
                            <Zap className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <div className="text-lg font-bold">{calculatedMetrics.averageGraphqlResponseTime.toFixed(0)}ms</div>
                            <div className="text-xs text-gray-600">Avg GraphQL Time</div>
                        </Card>
                        <Card className="p-4 text-center">
                            <Database className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                            <div className="text-lg font-bold">{((calculatedMetrics.totalRestPayloadSize + calculatedMetrics.totalGraphqlPayloadSize) / 1024 / 1024).toFixed(1)}MB</div>
                            <div className="text-xs text-gray-600">Total Data</div>
                        </Card>
                        <Card className="p-4 text-center">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                            <div className="text-lg font-bold">{calculatedMetrics.successRate.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">Success Rate</div>
                        </Card>
                    </div>

                    {/* Category Breakdown */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Performance by Category
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Category</th>
                                        <th className="text-center py-2">REST Wins</th>
                                        <th className="text-center py-2">GraphQL Wins</th>
                                        <th className="text-center py-2">Win Rate</th>
                                        <th className="text-center py-2">Avg Improvement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categorySummaries.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-4 text-gray-500">
                                                No category data available
                                            </td>
                                        </tr>
                                    ) : (
                                        categorySummaries.map((cat, index) => {
                                            const winRate = cat.totalTests > 0 ? (Math.max(cat.restWins, cat.graphqlWins) / cat.totalTests) * 100 : 0;
                                            const winner = cat.restWins > cat.graphqlWins ? "REST" : cat.graphqlWins > cat.restWins ? "GraphQL" : "TIE";

                                            return (
                                                <tr key={index} className="border-b hover:bg-gray-50">
                                                    <td className="py-2">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-lg">{cat.icon}</span>
                                                            <span className="font-medium">{cat.category}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-2">
                                                        <Badge variant={cat.restWins > cat.graphqlWins ? "default" : "secondary"}>{cat.restWins}</Badge>
                                                    </td>
                                                    <td className="text-center py-2">
                                                        <Badge variant={cat.graphqlWins > cat.restWins ? "default" : "secondary"}>{cat.graphqlWins}</Badge>
                                                    </td>
                                                    <td className="text-center py-2">
                                                        <div className="flex items-center justify-center space-x-1">
                                                            {winner === "REST" ? (
                                                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                                            ) : winner === "GraphQL" ? (
                                                                <TrendingUp className="w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <Minus className="w-4 h-4 text-gray-500" />
                                                            )}
                                                            <span className="font-medium">{winRate.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-2">
                                                        <span className="text-green-600 font-medium">+{cat.avgPerformanceImprovement.toFixed(1)}%</span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-4">
                        <div className="space-x-2">
                            <Button variant="outline" onClick={() => setShowDetails(!showDetails)}>
                                {showDetails ? "Hide" : "Show"} Detailed Results
                            </Button>
                        </div>
                        <div className="space-x-2">
                            <Button variant="outline" onClick={handleShareResults}>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share Results
                            </Button>
                            <Button variant="outline" onClick={handleExportResults}>
                                <Download className="w-4 h-4 mr-2" />
                                Export Data
                            </Button>
                            <Button onClick={onClose}>
                                <X className="w-4 h-4 mr-2" />
                                Close
                            </Button>
                        </div>
                    </div>

                    {/* Detailed Results */}
                    {showDetails && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Detailed Test Results</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {testResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded border-l-4 ${
                                            result.winner === "rest" ? "border-blue-500 bg-blue-50" : result.winner === "graphql" ? "border-green-500 bg-green-50" : "border-gray-500 bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium text-sm">{result.testType}</h4>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    REST: {result.restApi.responseTime.toFixed(2)}ms • GraphQL: {result.graphqlApi.responseTime.toFixed(2)}ms • Winner: {result.winner.toUpperCase()}
                                                </div>
                                            </div>
                                            <Badge variant={result.winner === "rest" ? "default" : result.winner === "graphql" ? "secondary" : "outline"}>{result.winner.toUpperCase()}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
