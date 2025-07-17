// Utility functions for building REST and GraphQL queries from testSpecs
import { testSpecs } from "../specs/testSpecs";
import { ValidationError, CustomRequest, GraphQLFieldStructure } from "../types";
import { sanitizeString } from "./secureStorage";

// Input validation utilities
function validateTableName(table: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!table || table.trim() === "") {
        errors.push({ field: "table", message: "Table name is required" });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        errors.push({ field: "table", message: "Invalid table name format", value: table });
    }

    return errors;
}

function validateFields(fields: string[] | null | undefined): ValidationError[] {
    const errors: ValidationError[] = [];

    if (fields) {
        for (const field of fields) {
            if (!field || field.trim() === "") {
                errors.push({ field: "fields", message: "Field name cannot be empty" });
            } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.([a-zA-Z_][a-zA-Z0-9_]*))*$/.test(field)) {
                errors.push({ field: "fields", message: "Invalid field name format", value: field });
            }
        }
    }

    return errors;
}

function validateLimit(limit: number | undefined): ValidationError[] {
    const errors: ValidationError[] = [];

    if (limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
            errors.push({ field: "limit", message: "Limit must be an integer between 1 and 10000", value: limit });
        }
    }

    return errors;
}

function validateFilter(filter: string | undefined): ValidationError[] {
    const errors: ValidationError[] = [];

    if (filter) {
        // Basic validation for query injection prevention
        const suspiciousPatterns = [/\bDROP\b/i, /\bDELETE\b/i, /\bUPDATE\b/i, /\bINSERT\b/i, /\bALTER\b/i, /\bCREATE\b/i];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(filter)) {
                errors.push({ field: "filter", message: "Filter contains potentially malicious content", value: filter });
                break;
            }
        }

        // Enhanced ServiceNow filter validation with JavaScript support
        if (filter.includes("javascript:")) {
            // Allow JavaScript expressions in ServiceNow filters
            // ServiceNow supports javascript: expressions for dynamic filtering
            const javascriptPattern = /javascript:[^;]+/;
            
            if (!javascriptPattern.test(filter)) {
                errors.push({ field: "filter", message: "Invalid JavaScript expression in filter", value: filter });
            }
            
            // Check for dangerous JavaScript patterns
            const dangerousJSPatterns = [
                /eval\s*\(/i,
                /Function\s*\(/i,
                /setTimeout\s*\(/i,
                /setInterval\s*\(/i,
                /XMLHttpRequest/i,
                /fetch\s*\(/i,
                /document\./i,
                /window\./i,
                /location\./i,
                /alert\s*\(/i,
                /confirm\s*\(/i,
                /prompt\s*\(/i
            ];
            
            for (const pattern of dangerousJSPatterns) {
                if (pattern.test(filter)) {
                    errors.push({ field: "filter", message: "Filter contains potentially dangerous JavaScript", value: filter });
                    break;
                }
            }
        } else {
            // Standard ServiceNow filter validation (non-JavaScript)
            // Only check for dangerous characters that could indicate SQL injection
            const dangerousChars = /[;]/;
            
            if (dangerousChars.test(filter)) {
                errors.push({ field: "filter", message: "Filter contains invalid characters", value: filter });
            }
        }
    }

    return errors;
}

export function buildRestUrl({ table, fields, limit, filter, offset, sort }: { table: string; fields?: string[] | null; limit?: number; filter?: string; offset?: number; sort?: string }): {
    url: string;
    errors: ValidationError[];
} {
    const errors: ValidationError[] = [];

    // Validate inputs
    errors.push(...validateTableName(table));
    errors.push(...validateFields(fields));
    errors.push(...validateLimit(limit));
    errors.push(...validateFilter(filter));

    if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
        errors.push({ field: "offset", message: "Offset must be a non-negative integer", value: offset });
    }

    // Return early if validation fails
    if (errors.length > 0) {
        return { url: "", errors };
    }

    // Sanitize inputs
    const sanitizedTable = sanitizeString(table);
    const sanitizedFilter = filter ? sanitizeString(filter) : undefined;
    const sanitizedSort = sort ? sanitizeString(sort) : undefined;

    let url = `api/now/table/${encodeURIComponent(sanitizedTable)}?`;

    // Ensure sys_id is always included for consistent sorting and comparison
    const fieldsToInclude = fields ? [...fields.map(sanitizeString)] : [];
    if (!fieldsToInclude.includes("sys_id")) {
        fieldsToInclude.push("sys_id");
    }

    if (fieldsToInclude.length) {
        url += `sysparm_fields=${fieldsToInclude.join(",")}&`;
    }
    if (limit) url += `sysparm_limit=${limit}&`;
    if (offset) url += `sysparm_offset=${offset}&`;

    // Build sysparm_query with filtering and ordering
    let queryConditions = "";
    if (sanitizedFilter) {
        queryConditions = sanitizedFilter;
    }

    // Add sorting to sysparm_query - default to sys_id for consistent ordering
    const sortField = sanitizedSort || "sys_id";
    if (queryConditions) {
        queryConditions += `^ORDERBY${sortField}`;
    } else {
        queryConditions = `ORDERBY${sortField}`;
    }

    url += `sysparm_query=${encodeURIComponent(queryConditions)}&`;

    return { url: url.replace(/&$/, ""), errors };
}

// Helper function to convert REST dot-walking fields to GraphQL nested structure
function convertDotWalkingFieldsToGraphQL(fields: string[]): Record<string, unknown> {
    const nestedFields: Record<string, unknown> = {};
    
    for (const field of fields) {
        if (field.includes('.')) {
            // Handle dot-walking field like "department.name" or "caller_id.user_name"
            const parts = field.split('.');
            let current = nestedFields;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                
                if (i === parts.length - 1) {
                    // Last part - this is the actual field we want
                    current[part] = { value: true, displayValue: true };
                } else {
                    // Intermediate part - create nested structure
                    if (!current[part]) {
                        current[part] = { _reference: {} };
                    }
                    current = (current[part] as Record<string, unknown>)._reference as Record<string, unknown>;
                }
            }
        } else {
            // Simple field without dot-walking
            nestedFields[field] = { value: true, displayValue: true };
        }
    }
    
    return nestedFields;
}

// Helper function to build nested GraphQL field structure
function buildNestedGraphQLFields(fieldsObj: Record<string, unknown>, indent = 10): string {
    const spaces = " ".repeat(indent);
    let result = "";

    for (const [fieldName, fieldValue] of Object.entries(fieldsObj)) {
        if (typeof fieldValue === "object" && fieldValue !== null) {
            if ("value" in fieldValue || "displayValue" in fieldValue) {
                // Leaf field with value/displayValue
                const valueFields = [];
                if ((fieldValue as Record<string, unknown>).value) valueFields.push("value");
                if ((fieldValue as Record<string, unknown>).displayValue) valueFields.push("displayValue");
                result += `${spaces}${fieldName} {\n${spaces}  ${valueFields.join(", ")}\n${spaces}}\n`;
            } else if ("_reference" in fieldValue) {
                // Reference field - need to wrap in _reference structure
                result += `${spaces}${fieldName} {\n`;
                result += `${spaces}  _reference {\n`;
                result += buildNestedGraphQLFields((fieldValue as Record<string, unknown>)._reference as Record<string, unknown>, indent + 4);
                result += `${spaces}  }\n`;
                result += `${spaces}}\n`;
            } else {
                // Nested object field (non-reference)
                result += `${spaces}${fieldName} {\n`;
                result += buildNestedGraphQLFields(fieldValue as Record<string, unknown>, indent + 2);
                result += `${spaces}}\n`;
            }
        }
    }

    return result;
}

export function buildGraphQLQuery({
    table,
    fields,
    limit,
    filter,
    after,
    orderBy,
}: {
    table: string;
    fields?: string[] | Record<string, unknown> | null;
    limit?: number;
    filter?: unknown;
    after?: string;
    orderBy?: unknown;
}): { query: string; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Validate inputs
    errors.push(...validateTableName(table));
    if (Array.isArray(fields)) {
        errors.push(...validateFields(fields));
    }
    errors.push(...validateLimit(limit));

    if (typeof filter === "string") {
        errors.push(...validateFilter(filter));
    }

    // Return early if validation fails
    if (errors.length > 0) {
        return { query: "", errors };
    }

    // Sanitize inputs
    const sanitizedTable = sanitizeString(table);
    let fieldJSON = "";

    if (fields) {
        if (Array.isArray(fields)) {
            // Convert array of field names to nested structure, handling dot-walking
            const fieldsToInclude = [...fields.map(sanitizeString)];
            if (!fieldsToInclude.includes("sys_id")) {
                fieldsToInclude.push("sys_id");
            }

            // Convert dot-walking fields to proper GraphQL nested structure
            const nestedFieldsObj = convertDotWalkingFieldsToGraphQL(fieldsToInclude);
            fieldJSON = buildNestedGraphQLFields(nestedFieldsObj, 10);
        } else if (typeof fields === "object") {
            // New nested field structure
            const fieldsObj = { ...fields } as Record<string, unknown>;

            // Ensure sys_id is included for consistent sorting
            if (!fieldsObj.sys_id) {
                fieldsObj.sys_id = { value: true, displayValue: true };
            }

            fieldJSON = buildNestedGraphQLFields(fieldsObj, 10);
        }
    } else {
        // If no fields specified, at least include sys_id
        fieldJSON = `          sys_id {
            value,
            displayValue
          }`;
    }

    // Build argument strings
    const args: string[] = [];

    // Build queryConditions with ordering
    let queryConditions = "";
    if (filter) {
        queryConditions = sanitizeString(filter as string);
    }

    // Add sorting to queryConditions - default to sys_id for consistent ordering
    const sortField = orderBy ? sanitizeString(orderBy as string) : "sys_id";
    if (queryConditions) {
        queryConditions += `^ORDERBY${sortField}`;
    } else {
        queryConditions = `ORDERBY${sortField}`;
    }

    args.push(`queryConditions: ${JSON.stringify(queryConditions)}`);

    if (limit) {
        const offsetVal = after ? `, offset: ${parseInt(after, 10)}` : "";
        args.push(`pagination: { limit: ${limit}${offsetVal} }`);
    }

    const argsStr = args.length ? `(${args.join(", ")})` : "";

    const query = `query {
    GlideRecord_Query {
      ${sanitizedTable}${argsStr} {
        _results {
${fieldJSON}        }
      }
    }
  }`;

    return { query, errors };
}

// Custom request builder functions
export function buildCustomRestUrl(request: CustomRequest): { url: string; errors: ValidationError[] } {
    return buildRestUrl({
        table: request.table,
        fields: request.restConfig.fields,
        limit: request.restConfig.limit,
        filter: request.restConfig.filters,
        sort: request.restConfig.orderBy,
    });
}

// Helper function to convert GraphQLFieldStructure to object for buildGraphQLQuery
function convertGraphQLFieldStructureToObject(fields: GraphQLFieldStructure): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
        if (typeof value === "boolean") {
            if (value) {
                result[key] = { value: true, displayValue: true };
            }
        } else if (typeof value === "object" && value !== null) {
            // Nested field structure
            result[key] = {
                _reference: convertGraphQLFieldStructureToObject(value),
            };
        }
    }

    return result;
}

export function buildCustomGraphQLQuery(request: CustomRequest): { query: string; errors: ValidationError[] } {
    const convertedFields = convertGraphQLFieldStructureToObject(request.graphqlConfig.fields);

    return buildGraphQLQuery({
        table: request.table,
        fields: convertedFields,
        limit: request.graphqlConfig.limit,
        filter: request.graphqlConfig.filters,
        orderBy: request.graphqlConfig.orderBy,
    });
}

// Helper function to calculate query complexity score
function calculateQueryComplexity(restCalls: Array<{ table: string; fields: string[]; filter?: string }>): number {
    let complexityScore = 0;

    for (const call of restCalls) {
        // Base score per table
        complexityScore += 10;

        // Score for number of fields
        complexityScore += call.fields.length * 2;

        // Score for dot-walking (relationship traversal)
        const dotWalkingFields = call.fields.filter((field) => field.includes("."));
        complexityScore += dotWalkingFields.length * 5;

        // Score for complex filters
        if (call.filter) {
            if (call.filter.includes("javascript:")) complexityScore += 15;
            if (call.filter.includes("^OR")) complexityScore += 10;
            if (call.filter.includes("^AND")) complexityScore += 5;
        }
    }

    return complexityScore;
}

// Multi-table GraphQL query builder for new structured graphqlFields format
export function buildStructuredGraphQLQuery({
    graphqlFields,
    limit,
    orderBy = "sys_id",
}: {
    graphqlFields: Record<string, {
        table: string;
        filter?: string;
        fields: Record<string, unknown>;
    }>;
    limit?: number;
    orderBy?: string;
}): { query: string; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Basic input validation
    if (!graphqlFields || Object.keys(graphqlFields).length === 0) {
        errors.push({ field: "graphqlFields", message: "At least one table query is required" });
        return { query: "", errors };
    }

    if (Object.keys(graphqlFields).length > 10) {
        errors.push({ field: "graphqlFields", message: "Maximum 10 tables allowed in multi-table query" });
        return { query: "", errors };
    }

    // Validate each table query
    for (const [queryName, queryConfig] of Object.entries(graphqlFields)) {
        const tableErrors = validateTableName(queryConfig.table);
        const filterErrors = validateFilter(queryConfig.filter);

        // Add context to errors
        tableErrors.forEach((error) => errors.push({ ...error, field: `graphqlFields[${queryName}].table` }));
        filterErrors.forEach((error) => errors.push({ ...error, field: `graphqlFields[${queryName}].filter` }));
    }

    errors.push(...validateLimit(limit));

    // Return early if validation fails
    if (errors.length > 0) {
        return { query: "", errors };
    }

    // Build individual table queries
    const tableQueries: string[] = [];

    for (const [queryName, queryConfig] of Object.entries(graphqlFields)) {
        const sanitizedTable = sanitizeString(queryConfig.table);
        const sanitizedQueryName = sanitizeString(queryName);

        // Ensure sys_id is included for consistent sorting
        const fieldsObj = { ...queryConfig.fields };
        if (!fieldsObj.sys_id) {
            fieldsObj.sys_id = { value: true, displayValue: true };
        }

        const fieldJSON = buildNestedGraphQLFields(fieldsObj, 10);

        // Build query conditions with ordering
        let queryConditions = "";
        if (queryConfig.filter) {
            queryConditions = sanitizeString(queryConfig.filter);
        }

        // Add sorting
        const sortField = sanitizeString(orderBy);
        if (queryConditions) {
            queryConditions += `^ORDERBY${sortField}`;
        } else {
            queryConditions = `ORDERBY${sortField}`;
        }

        // Build args
        const args: string[] = [];
        args.push(`queryConditions: ${JSON.stringify(queryConditions)}`);

        if (limit) {
            args.push(`pagination: { limit: ${limit} }`);
        }

        const argsStr = args.length ? `(${args.join(", ")})` : "";

        const tableQuery = `      ${sanitizedQueryName}: ${sanitizedTable}${argsStr} {
        _results {
${fieldJSON}
        }
      }`;

        tableQueries.push(tableQuery);
    }

    const query = `query {
    GlideRecord_Query {
${tableQueries.join("\n")}
    }
  }`;

    return { query, errors };
}

// Multi-table GraphQL query builder for scenarios with multiple REST calls
export function buildMultiTableGraphQLQuery({
    restCalls,
    limit,
    orderBy = "sys_id",
    maxComplexity = 500,
}: {
    restCalls: Array<{
        table: string;
        fields: string[];
        filter?: string;
    }>;
    limit?: number;
    orderBy?: string;
    maxComplexity?: number;
}): { query: string; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Basic input validation
    if (!restCalls || restCalls.length === 0) {
        errors.push({ field: "restCalls", message: "At least one REST call is required" });
        return { query: "", errors };
    }

    if (restCalls.length > 10) {
        errors.push({ field: "restCalls", message: "Maximum 10 tables allowed in multi-table query" });
        return { query: "", errors };
    }

    // Query complexity validation
    const complexityScore = calculateQueryComplexity(restCalls);
    if (complexityScore > maxComplexity) {
        errors.push({
            field: "restCalls",
            message: `Query complexity (${complexityScore}) exceeds maximum (${maxComplexity})`,
            value: complexityScore,
        });
        return { query: "", errors };
    }

    // Validate each REST call
    for (let i = 0; i < restCalls.length; i++) {
        const call = restCalls[i];
        const tableErrors = validateTableName(call.table);
        const fieldErrors = validateFields(call.fields);
        const filterErrors = validateFilter(call.filter);

        // Add context to errors
        tableErrors.forEach((error) => errors.push({ ...error, field: `restCalls[${i}].table` }));
        fieldErrors.forEach((error) => errors.push({ ...error, field: `restCalls[${i}].fields` }));
        filterErrors.forEach((error) => errors.push({ ...error, field: `restCalls[${i}].filter` }));
    }

    errors.push(...validateLimit(limit));

    // Return early if validation fails
    if (errors.length > 0) {
        return { query: "", errors };
    }

    // Build individual table queries
    const tableQueries: string[] = [];

    for (let i = 0; i < restCalls.length; i++) {
        const call = restCalls[i];
        const sanitizedTable = sanitizeString(call.table);
        const sanitizedFields = call.fields.map((field) => sanitizeString(field));

        // Ensure sys_id is included for consistent sorting
        if (!sanitizedFields.includes("sys_id")) {
            sanitizedFields.push("sys_id");
        }

        // Build field structure for GraphQL with proper dot-walking support
        const nestedFieldsObj = convertDotWalkingFieldsToGraphQL(sanitizedFields);
        const fieldJSON = buildNestedGraphQLFields(nestedFieldsObj, 10);

        // Build query conditions with ordering
        let queryConditions = "";
        if (call.filter) {
            queryConditions = sanitizeString(call.filter);
        }

        // Add sorting
        const sortField = sanitizeString(orderBy);
        if (queryConditions) {
            queryConditions += `^ORDERBY${sortField}`;
        } else {
            queryConditions = `ORDERBY${sortField}`;
        }

        // Build args
        const args: string[] = [];
        args.push(`queryConditions: ${JSON.stringify(queryConditions)}`);

        if (limit) {
            args.push(`pagination: { limit: ${limit} }`);
        }

        const argsStr = args.length ? `(${args.join(", ")})` : "";

        const tableQuery = `      ${sanitizedTable}${argsStr} {
        _results {
${fieldJSON}
        }
      }`;

        tableQueries.push(tableQuery);
    }

    const query = `query {
    GlideRecord_Query {
${tableQueries.join("\n")}
    }
  }`;

    return { query, errors };
}

// Enhanced validation function for production environments
export function validateMultiTableScenario(scenario: { name: string; restCalls: Array<{ table: string; fields: string[]; filter?: string }> }): {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    complexityScore: number;
} {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Run standard validation
    const queryResult = buildMultiTableGraphQLQuery({
        restCalls: scenario.restCalls,
        limit: 50, // Use standard limit for validation
        maxComplexity: 1000, // Allow higher complexity for validation
    });

    errors.push(...queryResult.errors);

    // Calculate complexity
    const complexityScore = calculateQueryComplexity(scenario.restCalls);

    // Performance warnings
    if (complexityScore > 300) {
        warnings.push(`High query complexity (${complexityScore}) may impact performance`);
    }

    if (scenario.restCalls.length > 5) {
        warnings.push(`Query spans ${scenario.restCalls.length} tables - consider breaking into smaller queries`);
    }

    // Field count warnings
    const totalFields = scenario.restCalls.reduce((sum, call) => sum + call.fields.length, 0);
    if (totalFields > 50) {
        warnings.push(`Total field count (${totalFields}) is high - consider reducing for better performance`);
    }

    // Dot-walking warnings
    const dotWalkingCount = scenario.restCalls.reduce((sum, call) => sum + call.fields.filter((field) => field.includes(".")).length, 0);
    if (dotWalkingCount > 10) {
        warnings.push(`High number of relationship traversals (${dotWalkingCount}) detected`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        complexityScore,
    };
}

// Validation function for custom requests
export function validateCustomRequest(request: Partial<CustomRequest>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!request.name || request.name.trim() === "") {
        errors.push({ field: "name", message: "Request name is required" });
    }

    if (!request.table || request.table.trim() === "") {
        errors.push({ field: "table", message: "Table name is required" });
    } else {
        errors.push(...validateTableName(request.table));
    }

    if (request.restConfig) {
        errors.push(...validateFields(request.restConfig.fields));
        errors.push(...validateLimit(request.restConfig.limit));
        errors.push(...validateFilter(request.restConfig.filters));
    }

    if (request.graphqlConfig) {
        errors.push(...validateLimit(request.graphqlConfig.limit));
        errors.push(...validateFilter(request.graphqlConfig.filters));
    }

    return errors;
}
