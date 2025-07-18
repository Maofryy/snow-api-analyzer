import React, { useState, useEffect } from "react";
import { TestSpecsService, ProcessedTestSpec, CategoryInfo } from "../../services/testSpecsService";
import { CategoryNavigator } from "./CategoryNavigator";
import { ScenarioDetails } from "./ScenarioDetails";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Search, Filter, Grid, List, Database, Layers } from "lucide-react";

interface TestSpecsExplorerProps {
    onRunTest?: (spec: ProcessedTestSpec) => void;
    onSwitchToBenchmark?: () => void;
}

export const TestSpecsExplorer: React.FC<TestSpecsExplorerProps> = ({ onRunTest, onSwitchToBenchmark }) => {
    const [testSpecs, setTestSpecs] = useState<ProcessedTestSpec[]>([]);
    const [categories, setCategories] = useState<CategoryInfo[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSpec, setSelectedSpec] = useState<ProcessedTestSpec | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    useEffect(() => {
        const processed = TestSpecsService.processTestSpecs();
        const categoryInfo = TestSpecsService.getCategoryInfo();
        setTestSpecs(processed);
        setCategories(categoryInfo);
    }, []);

    const filteredSpecs = testSpecs.filter((spec) => {
        const matchesSearch = spec.name.toLowerCase().includes(searchTerm.toLowerCase()) || spec.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || spec.category === selectedCategory;
        const matchesComplexity = true;

        return matchesSearch && matchesCategory && matchesComplexity;
    });

    const handleSpecSelect = (spec: ProcessedTestSpec) => {
        setSelectedSpec(spec);
    };

    const handleRunTest = (spec: ProcessedTestSpec) => {
        if (onRunTest) {
            onRunTest(spec);
        }
        // Switch to benchmark tab after starting test
        if (onSwitchToBenchmark) {
            onSwitchToBenchmark();
        }
    };

    return (
        <div className="bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Controls */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Test Specifications Explorer</h2>
                            <p className="text-gray-600 mt-1">Explore and understand ServiceNow API benchmark test scenarios</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search test specs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Categories Sidebar */}
                    <div className="w-80">
                        <CategoryNavigator categories={categories} selectedCategory={selectedCategory} onCategorySelect={setSelectedCategory} />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {selectedCategory ? (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">{categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}</h2>
                                        <p className="text-gray-600">
                                            {filteredSpecs.length} test scenario{filteredSpecs.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>

                                    {selectedCategory && (
                                        <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                                            View All Categories
                                        </Button>
                                    )}
                                </div>

                                {/* GraphQL Record Limit Notice for Performance Scale Tests */}
                                {selectedCategory === 'performanceScaleTests' && (
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <div className="text-amber-600 text-lg">⚠️</div>
                                            <div>
                                                <h3 className="font-medium text-amber-800 mb-1">GraphQL Record Limit Notice</h3>
                                                <p className="text-sm text-amber-700">
                                                    By default, GraphQL queries are limited to 1000 records. To test large datasets above this limit, 
                                                    update the system property <code className="bg-amber-100 px-1 rounded font-mono text-amber-800">glide.graphql.gliderecord.maxResults.limit</code> in your ServiceNow instance.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Specs Display */}
                                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                                    {filteredSpecs.map((spec) => (
                                        <Card
                                            key={spec.id}
                                            className={`cursor-pointer transition-all hover:shadow-md ${selectedSpec?.id === spec.id ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
                                            onClick={() => handleSpecSelect(spec)}
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <CardTitle className="text-lg font-medium text-gray-900">{spec.name}</CardTitle>
                                                        {spec.restCalls && spec.restCalls.length > 1 && <Layers className="w-4 h-4 text-blue-600" title="Multi-table queries" />}
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="pt-0">
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{spec.description}</p>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium text-gray-700">Table:</span>
                                                        <span className="ml-1 text-gray-900">
                                                            {spec.table || (spec.restCalls && spec.restCalls.length > 1 ? 
                                                                "See multi-table config" : 
                                                                "Not specified"
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Fields:</span>
                                                        <span className="ml-1 text-gray-900">{spec.expectedFields.length}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Dot-walking:</span>
                                                        <span className="ml-1 text-gray-900">{spec.dotWalkingDepth} levels</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Variant:</span>
                                                        <span className="ml-1 text-gray-900 text-xs break-words">{spec.variant}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-4">
                                                    <div className="flex gap-1">
                                                        {spec.recordLimits.map((limit) => (
                                                            <Badge key={limit} variant="secondary" className="text-xs">
                                                                {limit}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRunTest(spec);
                                                        }}
                                                    >
                                                        Run Test
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {filteredSpecs.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500">No test specifications found matching your criteria.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm p-12">
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to Test Specifications Explorer</h2>
                                    <p className="text-gray-600 mb-8">Select a category to explore test scenarios and understand their implementation</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                                        {categories.map((category) => (
                                            <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory(category.id)}>
                                                <CardContent className="p-6 text-center">
                                                    <div className="text-4xl mb-3">{category.icon}</div>
                                                    <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                                                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                                                    <Badge variant="secondary">
                                                        {category.count} scenario{category.count !== 1 ? "s" : ""}
                                                    </Badge>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Scenario Details Panel */}
            {selectedSpec && <ScenarioDetails spec={selectedSpec} onClose={() => setSelectedSpec(null)} onRunTest={handleRunTest} />}
        </div>
    );
};
