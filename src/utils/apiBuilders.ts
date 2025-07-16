// Utility functions for building REST and GraphQL queries from testSpecs
import { testSpecs } from "../specs/testSpecs";
import { ValidationError, CustomRequest, GraphQLFieldStructure } from "../types";
import { sanitizeString } from "./secureStorage";

// Input validation utilities
function validateTableName(table: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!table || table.trim() === '') {
    errors.push({ field: 'table', message: 'Table name is required' });
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    errors.push({ field: 'table', message: 'Invalid table name format', value: table });
  }
  
  return errors;
}

function validateFields(fields: string[] | null | undefined): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (fields) {
    for (const field of fields) {
      if (!field || field.trim() === '') {
        errors.push({ field: 'fields', message: 'Field name cannot be empty' });
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.([a-zA-Z_][a-zA-Z0-9_]*))*$/.test(field)) {
        errors.push({ field: 'fields', message: 'Invalid field name format', value: field });
      }
    }
  }
  
  return errors;
}

function validateLimit(limit: number | undefined): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      errors.push({ field: 'limit', message: 'Limit must be an integer between 1 and 10000', value: limit });
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
        errors.push({ field: 'filter', message: 'Filter contains potentially malicious content', value: filter });
        break;
      }
    }
  }
  
  return errors;
}

export function buildRestUrl({ table, fields, limit, filter, offset, sort }: { 
  table: string; 
  fields?: string[] | null; 
  limit?: number; 
  filter?: string; 
  offset?: number; 
  sort?: string; 
}): { url: string; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  // Validate inputs
  errors.push(...validateTableName(table));
  errors.push(...validateFields(fields));
  errors.push(...validateLimit(limit));
  errors.push(...validateFilter(filter));
  
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    errors.push({ field: 'offset', message: 'Offset must be a non-negative integer', value: offset });
  }
  
  // Return early if validation fails
  if (errors.length > 0) {
    return { url: '', errors };
  }
  
  // Sanitize inputs
  const sanitizedTable = sanitizeString(table);
  const sanitizedFilter = filter ? sanitizeString(filter) : undefined;
  const sanitizedSort = sort ? sanitizeString(sort) : undefined;
  
  let url = `api/now/table/${encodeURIComponent(sanitizedTable)}?`;
    
  // Ensure sys_id is always included for consistent sorting and comparison
  const fieldsToInclude = fields ? [...fields.map(sanitizeString)] : [];
  if (!fieldsToInclude.includes('sys_id')) {
    fieldsToInclude.push('sys_id');
  }
  
  if (fieldsToInclude.length) {
    url += `sysparm_fields=${fieldsToInclude.join(",")}&`;
  }
  if (limit) url += `sysparm_limit=${limit}&`;
  if (offset) url += `sysparm_offset=${offset}&`;
  
  // Build sysparm_query with filtering and ordering
  let queryConditions = '';
  if (sanitizedFilter) {
    queryConditions = sanitizedFilter;
  }
  
  // Add sorting to sysparm_query - default to sys_id for consistent ordering
  const sortField = sanitizedSort || 'sys_id';
  if (queryConditions) {
    queryConditions += `^ORDERBY${sortField}`;
  } else {
    queryConditions = `ORDERBY${sortField}`;
  }
  
  url += `sysparm_query=${encodeURIComponent(queryConditions)}&`;
  
  return { url: url.replace(/&$/, ""), errors };
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
  
  if (typeof filter === 'string') {
    errors.push(...validateFilter(filter));
  }
  
  // Return early if validation fails
  if (errors.length > 0) {
    return { query: '', errors };
  }
  
  // Sanitize inputs
  const sanitizedTable = sanitizeString(table);
  let fieldJSON = "";

  if (fields) {
    if (Array.isArray(fields)) {
      // Legacy support for array of field names (simple fields)
      // Ensure sys_id is included for consistent sorting
      const fieldsToInclude = [...fields.map(sanitizeString)];
      if (!fieldsToInclude.includes('sys_id')) {
        fieldsToInclude.push('sys_id');
      }
      
      fieldJSON = fieldsToInclude
        .map((field) => {
          return `          ${field} {
            value,
            displayValue
          }`;
        })
        .join("\n");
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
  let queryConditions = '';
  if (filter) {
    queryConditions = sanitizeString(filter as string);
  }
  
  // Add sorting to queryConditions - default to sys_id for consistent ordering
  const sortField = orderBy ? sanitizeString(orderBy as string) : 'sys_id';
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
    sort: request.restConfig.orderBy
  });
}

// Helper function to convert GraphQLFieldStructure to object for buildGraphQLQuery
function convertGraphQLFieldStructureToObject(fields: GraphQLFieldStructure): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'boolean') {
      if (value) {
        result[key] = { value: true, displayValue: true };
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested field structure
      result[key] = {
        _reference: convertGraphQLFieldStructureToObject(value)
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
    orderBy: request.graphqlConfig.orderBy
  });
}

// Validation function for custom requests
export function validateCustomRequest(request: Partial<CustomRequest>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!request.name || request.name.trim() === '') {
    errors.push({ field: 'name', message: 'Request name is required' });
  }
  
  if (!request.table || request.table.trim() === '') {
    errors.push({ field: 'table', message: 'Table name is required' });
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
