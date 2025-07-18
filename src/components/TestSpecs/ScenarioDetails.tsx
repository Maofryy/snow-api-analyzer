import React, { useState } from "react";
import { ProcessedTestSpec } from "../../services/testSpecsService";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { X, Play, Code, Database, GitBranch, Layers, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { CodePreview } from "./CodePreview";
import { FieldsExplorer } from "./FieldsExplorer";

interface ScenarioDetailsProps {
    spec: ProcessedTestSpec;
    onClose: () => void;
    onRunTest: (spec: ProcessedTestSpec) => void;
}

export const ScenarioDetails: React.FC<ScenarioDetailsProps> = ({ spec, onClose, onRunTest }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["metadata"]));
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    const handleCopy = async (content: string, key: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedStates((prev) => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setCopiedStates((prev) => ({ ...prev, [key]: false }));
            }, 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    const CopyButton: React.FC<{ content: string; copyKey: string }> = ({ content, copyKey }) => (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopy(content, copyKey)}>
            {copiedStates[copyKey] ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
    );

    const ExpandableSection: React.FC<{
        id: string;
        title: string;
        icon: React.ReactNode;
        children: React.ReactNode;
    }> = ({ id, title, icon, children }) => {
        const isExpanded = expandedSections.has(id);

        return (
            <div className="border border-gray-200 rounded-lg">
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors" onClick={() => toggleSection(id)}>
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="font-medium text-gray-900">{title}</h3>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                </button>
                {isExpanded && <div className="border-t border-gray-200 p-4">{children}</div>}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="scenario-title" aria-describedby="scenario-description">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <CardTitle id="scenario-title" className="text-xl font-semibold">{spec.name}</CardTitle>
                            <p id="scenario-description" className="text-gray-600 mt-1">{spec.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">{spec.category}</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => onRunTest(spec)} className="bg-blue-600 hover:bg-blue-700">
                            <Play className="h-4 w-4 mr-2" />
                            Run Test & Switch to Benchmark
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="border-b border-gray-200">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="implementation">Implementation</TabsTrigger>
                                <TabsTrigger value="fields">Fields</TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="h-[calc(90vh-200px)]">
                            <div className="p-6">
                                <TabsContent value="overview" className="mt-0">
                                    <div className="space-y-6">
                                        {/* Test Metadata */}
                                        <ExpandableSection id="metadata" title="Test Metadata" icon={<Database className="h-5 w-5 text-blue-600" />}>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <span className="text-sm text-gray-600">Table:</span>
                                                    <p className="font-mono text-sm font-medium">
                                                        {spec.table || (spec.restCalls && spec.restCalls.length > 1 ? "See multi-table config" : "Not specified")}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-sm text-gray-600">Fields:</span>
                                                    <p className="font-mono text-sm font-medium">{spec.expectedFields.length}</p>
                                                </div>
                                                <div>
                                                    <span className="text-sm text-gray-600">Dot-walking:</span>
                                                    <p className="font-mono text-sm font-medium">{spec.dotWalkingDepth} levels</p>
                                                </div>
                                            </div>

                                            <Separator className="my-4" />

                                            <div>
                                                <span className="text-sm text-gray-600 mb-2 block">Record Limits:</span>
                                                <div className="flex gap-2">
                                                    {spec.recordLimits.map((limit) => (
                                                        <Badge key={limit} variant="outline">
                                                            {limit}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {spec.filter && (
                                                <div className="mt-4">
                                                    <span className="text-sm text-gray-600 mb-2 block">Filter:</span>
                                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{spec.filter}</code>
                                                </div>
                                            )}
                                        </ExpandableSection>

                                        {/* Multi-table information */}
                                        {spec.restCalls && (
                                            <ExpandableSection id="multi-table" title="Multi-Table Configuration" icon={<Layers className="h-5 w-5 text-green-600" />}>
                                                <div className="space-y-3">
                                                    {spec.restCalls.map((call, index) => (
                                                        <Card key={index} className="p-3">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-medium">Table: {call.table}</span>
                                                                <Badge variant="secondary">{call.fields.length} fields</Badge>
                                                            </div>
                                                            <div className="text-sm text-gray-600">Fields: {call.fields.join(", ")}</div>
                                                            {call.filter && (
                                                                <div className="text-sm text-gray-600 mt-1">
                                                                    Filter: <code className="bg-gray-100 px-1 rounded">{call.filter}</code>
                                                                </div>
                                                            )}
                                                        </Card>
                                                    ))}
                                                </div>
                                            </ExpandableSection>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="implementation" className="mt-0">
                                    <CodePreview spec={spec} onCopy={handleCopy} copiedStates={copiedStates} />
                                </TabsContent>

                                <TabsContent value="fields" className="mt-0">
                                    <FieldsExplorer restFields={spec.expectedFields} graphqlFields={spec.graphqlFields} table={spec.table} restCalls={spec.restCalls} />
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};
