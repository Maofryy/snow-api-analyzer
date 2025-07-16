// Centralized API service with security, validation, caching, and monitoring
import { buildRestUrl, buildGraphQLQuery } from "../utils/apiBuilders";
import { createCachedApiCall, apiCache } from "../utils/apiCache";
import { logger, withPerformanceLogging } from "../utils/logger";
import { createSecureAuthHeader } from "../utils/secureStorage";
import { compareApiResponses } from "../utils/dataComparison";
import { makeAuthenticatedRequest } from "./authService";
import { ApiCallResult, ApiError, ServiceNowInstance, TestResult, ValidationError } from "../types";

export interface ApiServiceConfig {
    enableCaching: boolean;
    cacheTimeout: number;
    maxRetries: number;
    requestTimeout: number;
    rateLimitDelay: number;
}

export interface BenchmarkTestParams {
    table: string;
    restFields?: string[];
    graphqlFields?: string[] | Record<string, unknown>;
    limit?: number;
    filter?: string;
    iterations?: number;
}

export interface BenchmarkResult {
    testId: string;
    testType: string;
    restResult: ApiCallResult;
    graphqlResult: ApiCallResult;
    winner: "rest" | "graphql" | "tie";
    dataComparison?: ReturnType<typeof compareApiResponses>;
    performanceMetrics: {
        totalExecutionTime: number;
        restTotalTime: number;
        graphqlTotalTime: number;
        requestsCount: number;
    };
}

class ApiService {
    private config: ApiServiceConfig;
    private instance: ServiceNowInstance | null = null;
    private requestQueue: Array<() => Promise<unknown>> = [];
    private isProcessingQueue = false;

    constructor(config: Partial<ApiServiceConfig> = {}) {
        this.config = {
            enableCaching: true,
            cacheTimeout: 300000, // 5 minutes
            maxRetries: 3,
            requestTimeout: 30000, // 30 seconds
            rateLimitDelay: 100, // 100ms between requests
            ...config,
        };

        logger.info("ApiService initialized", "apiService", this.config);
    }

    public setInstance(instance: ServiceNowInstance): void {
        this.instance = instance;
        logger.info("ServiceNow instance configured", "apiService", {
            url: instance.url,
            username: instance.username ? "***" : "not provided",
            connected: instance.connected,
        });
    }

    public getConfig(): ApiServiceConfig {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<ApiServiceConfig>): void {
        this.config = { ...this.config, ...newConfig };
        logger.info("ApiService configuration updated", "apiService", this.config);
    }

    private validateInstance(skipConnectionCheck = false): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!this.instance) {
            errors.push({ field: "instance", message: "ServiceNow instance not configured" });
            return errors;
        }

        if (!this.instance.url) {
            errors.push({ field: "url", message: "ServiceNow URL is required" });
        }

        // Check credentials based on auth mode
        if (this.instance.authMode === 'basic') {
            if (!this.instance.username || !this.instance.password) {
                errors.push({ field: "credentials", message: "Username and password are required for basic auth" });
            }
        } else if (this.instance.authMode === 'session') {
            // Session auth doesn't require username/password validation here
        }

        if (!skipConnectionCheck && !this.instance.connected) {
            errors.push({ field: "connection", message: "ServiceNow instance is not connected" });
        }

        return errors;
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) return;

        this.isProcessingQueue = true;
        logger.debug(`Processing request queue (${this.requestQueue.length} items)`, "apiService");

        try {
            while (this.requestQueue.length > 0) {
                const request = this.requestQueue.shift();
                if (request) {
                    await request();

                    // Rate limiting
                    if (this.requestQueue.length > 0) {
                        await new Promise((resolve) => setTimeout(resolve, this.config.rateLimitDelay));
                    }
                }
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const result = await request();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });

            this.processQueue();
        });
    }

    private async executeApiCall<T>(url: string, options: RequestInit, context: string, skipConnectionCheck = false): Promise<ApiCallResult<T>> {
        const validationErrors = this.validateInstance(skipConnectionCheck);
        if (validationErrors.length > 0) {
            logger.logValidationErrors(validationErrors, context);
            return {
                success: false,
                error: {
                    message: "Configuration validation failed",
                    code: "VALIDATION_ERROR",
                    details: validationErrors,
                    timestamp: new Date(),
                },
                responseTime: 0,
                payloadSize: 0,
                allResponseTimes: [],
            };
        }

        logger.debug(`Making API call: ${options.method || "GET"} ${url}`, context);

        return await this.queueRequest(async () => {
            const startTime = performance.now();
            
            try {
                const response = await makeAuthenticatedRequest(url, {
                    ...options,
                    signal: AbortSignal.timeout(this.config.requestTimeout),
                }, this.instance!);

                const endTime = performance.now();
                const responseTime = endTime - startTime;

                if (!response.ok) {
                    const error: ApiError = {
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        code: "HTTP_ERROR",
                        details: { status: response.status, statusText: response.statusText },
                        timestamp: new Date(),
                    };

                    logger.logApiCall(options.method || "GET", url, responseTime, false, context, error);
                    
                    return {
                        success: false,
                        error,
                        responseTime,
                        payloadSize: 0,
                        allResponseTimes: [responseTime],
                    };
                }

                const data = await response.json();
                const responseText = JSON.stringify(data);
                const payloadSize = new Blob([responseText]).size;

                logger.logApiCall(options.method || "GET", url, responseTime, true, context);

                return {
                    success: true,
                    data,
                    responseTime,
                    payloadSize,
                    allResponseTimes: [responseTime],
                };
            } catch (error) {
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                
                const apiError: ApiError = {
                    message: error instanceof Error ? error.message : "Unknown error",
                    code: "REQUEST_ERROR",
                    details: error,
                    timestamp: new Date(),
                };

                logger.logApiCall(options.method || "GET", url, responseTime, false, context, apiError);

                return {
                    success: false,
                    error: apiError,
                    responseTime,
                    payloadSize: 0,
                    allResponseTimes: [responseTime],
                };
            }
        });
    }

    public async makeRestCall<T = unknown>(params: BenchmarkTestParams): Promise<ApiCallResult<T>> {
        const urlResult = buildRestUrl({
            table: params.table,
            fields: params.restFields,
            limit: params.limit,
            filter: params.filter,
        });

        if (urlResult.errors.length > 0) {
            logger.logValidationErrors(urlResult.errors, "makeRestCall");
            return {
                success: false,
                error: {
                    message: "REST URL validation failed",
                    code: "VALIDATION_ERROR",
                    details: urlResult.errors,
                    timestamp: new Date(),
                },
                responseTime: 0,
                payloadSize: 0,
                allResponseTimes: [],
            };
        }

        return await this.executeApiCall<T>(urlResult.url, { method: "GET" }, "REST");
    }

    public async makeGraphQLCall<T = unknown>(params: BenchmarkTestParams): Promise<ApiCallResult<T>> {
        const queryResult = buildGraphQLQuery({
            table: params.table,
            fields: params.graphqlFields,
            limit: params.limit,
            filter: params.filter,
        });

        if (queryResult.errors.length > 0) {
            logger.logValidationErrors(queryResult.errors, "makeGraphQLCall");
            return {
                success: false,
                error: {
                    message: "GraphQL query validation failed",
                    code: "VALIDATION_ERROR",
                    details: queryResult.errors,
                    timestamp: new Date(),
                },
                responseTime: 0,
                payloadSize: 0,
                allResponseTimes: [],
            };
        }

        return await this.executeApiCall<T>(
            "api/now/graphql",
            {
                method: "POST",
                body: JSON.stringify({ query: queryResult.query }),
            },
            "GraphQL"
        );
    }

    public async runBenchmarkTest(testId: string, testType: string, params: BenchmarkTestParams): Promise<BenchmarkResult> {
        const startTime = performance.now();

        logger.info(`Starting benchmark test: ${testId}`, "benchmark", { testType, params });

        // Execute both API calls with randomized order to reduce bias
        const runRestFirst = Math.random() < 0.5;
        let restResult: ApiCallResult;
        let graphqlResult: ApiCallResult;

        try {
            if (runRestFirst) {
                restResult = await this.makeRestCall(params);
                // Small delay to reduce interference
                await new Promise((resolve) => setTimeout(resolve, 200));
                graphqlResult = await this.makeGraphQLCall(params);
            } else {
                graphqlResult = await this.makeGraphQLCall(params);
                // Small delay to reduce interference
                await new Promise((resolve) => setTimeout(resolve, 200));
                restResult = await this.makeRestCall(params);
            }

            // Determine winner
            const winner = restResult.success && graphqlResult.success ? (restResult.responseTime < graphqlResult.responseTime ? "rest" : "graphql") : restResult.success ? "rest" : "graphql";

            // Compare data if both calls succeeded
            let dataComparison;
            if (restResult.success && graphqlResult.success && restResult.data && graphqlResult.data) {
                const expectedFields = Array.isArray(params.restFields) ? params.restFields : ["sys_id", "number", "short_description"];

                dataComparison = compareApiResponses(restResult.data, graphqlResult.data, params.table, expectedFields);
            }

            const totalExecutionTime = performance.now() - startTime;
            const result: BenchmarkResult = {
                testId,
                testType,
                restResult,
                graphqlResult,
                winner,
                dataComparison,
                performanceMetrics: {
                    totalExecutionTime,
                    restTotalTime: restResult.responseTime,
                    graphqlTotalTime: graphqlResult.responseTime,
                    requestsCount: 2,
                },
            };

            logger.info(`Benchmark test completed: ${testId}`, "benchmark", {
                winner,
                restTime: restResult.responseTime,
                graphqlTime: graphqlResult.responseTime,
                totalTime: totalExecutionTime,
                dataEquivalent: dataComparison?.isEquivalent,
            });

            return result;
        } catch (error) {
            logger.error(`Benchmark test failed: ${testId}`, "benchmark", { params }, error as Error);
            throw error;
        }
    }

    public async testConnection(): Promise<{ success: boolean; error?: ApiError }> {
        try {
            // For connection testing, we need to skip the connection check validation
            const urlResult = buildRestUrl({
                table: "sys_user",
                fields: ["sys_id", "user_name"],
                limit: 1,
            });

            if (urlResult.errors.length > 0) {
                return {
                    success: false,
                    error: {
                        message: "Connection test URL validation failed",
                        code: "VALIDATION_ERROR",
                        details: urlResult.errors,
                        timestamp: new Date(),
                    },
                };
            }

            const result = await this.executeApiCall(urlResult.url, { method: "GET" }, "CONNECTION_TEST", true);

            return {
                success: result.success,
                error: result.error,
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : "Connection test failed",
                    code: "CONNECTION_ERROR",
                    details: error,
                    timestamp: new Date(),
                },
            };
        }
    }

    public getCacheStats() {
        return apiCache.getStats();
    }

    public clearCache(): void {
        apiCache.clear();
        logger.info("API cache cleared", "apiService");
    }

    public getServiceStats() {
        return {
            queueSize: this.requestQueue.length,
            isProcessingQueue: this.isProcessingQueue,
            config: this.config,
            cache: this.getCacheStats(),
        };
    }
}

// Export singleton instance
export const apiService = new ApiService();
