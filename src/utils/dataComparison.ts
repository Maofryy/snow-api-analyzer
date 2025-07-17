// Utility functions for comparing REST and GraphQL API responses
// Optimized for performance with caching and efficient algorithms

import { logger } from './logger';
import { ValidationError } from '../types';

// Cache for sorted records to avoid repeated sorting
interface SortedRecordCache {
  records: Record<string, unknown>[];
  sortedIds: string[];
  lastUpdated: number;
}

const sortCache = new Map<string, SortedRecordCache>();
const CACHE_TTL = 300000; // 5 minutes

// Performance optimized record sorting with caching
function getSortedRecords(records: Record<string, unknown>[], isGraphQL: boolean = false): Record<string, unknown>[] {
  if (records.length === 0) return [];
  
  // Create cache key based on record structure
  const cacheKey = `${isGraphQL ? 'gql' : 'rest'}_${records.length}_${JSON.stringify(records[0])}`;
  const cached = sortCache.get(cacheKey);
  
  // Return cached result if still valid
  if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
    logger.debug('Using cached sorted records', 'dataComparison');
    return cached.records;
  }
  
  // Sort records by sys_id for consistent comparison
  const sortedRecords = [...records].sort((a, b) => {
    const aId = isGraphQL 
      ? (extractNestedGraphQLValue(a, 'sys_id') as string) || ''
      : (a.sys_id as string) || '';
    const bId = isGraphQL
      ? (extractNestedGraphQLValue(b, 'sys_id') as string) || ''
      : (b.sys_id as string) || '';
    return aId.localeCompare(bId);
  });
  
  // Cache the sorted result
  sortCache.set(cacheKey, {
    records: sortedRecords,
    sortedIds: sortedRecords.map(r => isGraphQL 
      ? (extractNestedGraphQLValue(r, 'sys_id') as string) || ''
      : (r.sys_id as string) || ''
    ),
    lastUpdated: Date.now()
  });
  
  return sortedRecords;
}

// Cleanup cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cache] of sortCache.entries()) {
    if (now - cache.lastUpdated > CACHE_TTL) {
      sortCache.delete(key);
    }
  }
}, CACHE_TTL);

export interface DataComparisonResult {
  isEquivalent: boolean;
  recordCountMatch: boolean;
  dataConsistency: number; // 0-100 percentage
  issues: string[];
  restRecordCount: number;
  graphqlRecordCount: number;
  fieldMismatches: Array<{
    recordIndex: number;
    field: string;
    restValue: unknown;
    graphqlValue: unknown;
    isWarning?: boolean;
  }>;
}

// Memoized value normalization for performance
const normalizeCache = new Map<string, unknown>();

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  
  if (typeof value === 'string') {
    // Use cache for string normalization
    const cached = normalizeCache.get(value);
    if (cached !== undefined) return cached;
    
    const trimmed = value.trim();
    // Treat empty strings as null for comparison purposes
    const normalized = trimmed === '' ? null : trimmed;
    
    // Cache the result
    normalizeCache.set(value, normalized);
    return normalized;
  }
  
  return value;
}

// Cleanup normalize cache periodically
setInterval(() => {
  if (normalizeCache.size > 10000) {
    normalizeCache.clear();
  }
}, 60000); // Clean every minute

function extractGraphQLValue(graphqlField: unknown): unknown {
  if (!graphqlField) return null;
  // GraphQL returns {value, displayValue} - prefer value for comparison
  const field = graphqlField as Record<string, unknown>;
  return field.value !== undefined ? field.value : field.displayValue;
}

// Memoized nested GraphQL value extraction
const extractionCache = new Map<string, unknown>();

function extractNestedGraphQLValue(graphqlRecord: Record<string, unknown>, fieldPath: string): unknown {
  if (!graphqlRecord || !fieldPath) return null;
  
  // Create cache key
  const cacheKey = `${JSON.stringify(graphqlRecord)}_${fieldPath}`;
  const cached = extractionCache.get(cacheKey);
  if (cached !== undefined) return cached;
  
  const parts = fieldPath.split('.');
  if (parts.length === 1) {
    // Simple field
    const result = extractGraphQLValue(graphqlRecord[fieldPath]);
    extractionCache.set(cacheKey, result);
    return result;
  }
  
  // Dot-walked field - navigate through _reference structure
  let current = graphqlRecord;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (!current || typeof current !== 'object') {
      extractionCache.set(cacheKey, null);
      return null;
    }
    
    if (i === parts.length - 1) {
      // Last part - extract the actual value
      const result = extractGraphQLValue(current[part]);
      extractionCache.set(cacheKey, result);
      return result;
    } else {
      // Navigate through reference
      const refField = current[part] as Record<string, unknown>;
      if (!refField || !refField._reference) {
        extractionCache.set(cacheKey, null);
        return null;
      }
      current = refField._reference as Record<string, unknown>;
    }
  }
  
  extractionCache.set(cacheKey, null);
  return null;
}

// Cleanup extraction cache periodically
setInterval(() => {
  if (extractionCache.size > 10000) {
    extractionCache.clear();
  }
}, 60000);

// Helper function to detect known REST reference field format differences
function isKnownReferenceFieldFormatDifference(restValue: unknown, graphqlValue: unknown): boolean {
  if (!restValue || !graphqlValue) return false;
  
  // Check if REST value is an object with 'link' and 'value' properties
  if (typeof restValue === 'object' && restValue !== null) {
    const restObj = restValue as Record<string, unknown>;
    
    // REST reference field format: {link: "...", value: "sys_id"}
    if (restObj.link && restObj.value && typeof restObj.value === 'string') {
      // GraphQL returns just the sys_id string
      if (typeof graphqlValue === 'string' && restObj.value === graphqlValue) {
        return true;
      }
    }
  }
  
  return false;
}

function extractRestRecords(restResponse: unknown): Record<string, unknown>[] {
  if (!restResponse) return [];
  
  try {
    const response = restResponse as Record<string, unknown>;
    // REST API typically returns {result: [...]}
    if (response.result && Array.isArray(response.result)) {
      return response.result;
    }
    // Or directly as array
    if (Array.isArray(restResponse)) {
      return restResponse;
    }
  } catch (error) {
    logger.error('Error extracting REST records', 'dataComparison', { restResponse }, error as Error);
  }
  
  return [];
}

function extractGraphQLRecords(graphqlResponse: unknown, tableName: string): Record<string, unknown>[] {
  try {
    const response = graphqlResponse as Record<string, unknown>;
    if (!response?.data || typeof response.data !== 'object') return [];
    
    const data = response.data as Record<string, unknown>;
    if (!data.GlideRecord_Query || typeof data.GlideRecord_Query !== 'object') return [];
    
    const query = data.GlideRecord_Query as Record<string, unknown>;
    if (!query[tableName] || typeof query[tableName] !== 'object') return [];
    
    const table = query[tableName] as Record<string, unknown>;
    if (!Array.isArray(table._results)) return [];
    
    return table._results;
  } catch (error) {
    logger.error('Error extracting GraphQL records', 'dataComparison', { graphqlResponse, tableName }, error as Error);
    return [];
  }
}

// Multi-table comparison result interface
export interface MultiTableComparisonResult extends DataComparisonResult {
  tableResults: Array<{
    tableName: string;
    restRecordCount: number;
    graphqlRecordCount: number;
    dataConsistency: number;
    fieldMismatches: Array<{
      recordIndex: number;
      field: string;
      restValue: unknown;
      graphqlValue: unknown;
      isWarning?: boolean;
    }>;
    issues: string[];
  }>;
}

// Compare multi-table API responses (multiple REST calls vs single GraphQL)
export function compareMultiTableApiResponses(
  restResponses: unknown[], // Array of REST API responses
  graphqlResponse: unknown,
  restCalls: Array<{
    table: string;
    fields: string[];
    filter?: string;
  }>
): MultiTableComparisonResult {
  const aggregatedIssues: string[] = [];
  const aggregatedFieldMismatches: Array<{
    recordIndex: number;
    field: string;
    restValue: unknown;
    graphqlValue: unknown;
    isWarning?: boolean;
  }> = [];
  const tableResults: MultiTableComparisonResult['tableResults'] = [];

  let totalRestRecords = 0;
  let totalGraphqlRecords = 0;
  let totalComparisons = 0;
  let totalMatchingComparisons = 0;

  // Validate input lengths match
  if (restResponses.length !== restCalls.length) {
    aggregatedIssues.push(`Mismatch between REST responses (${restResponses.length}) and REST calls (${restCalls.length})`);
    return {
      isEquivalent: false,
      recordCountMatch: false,
      dataConsistency: 0,
      issues: aggregatedIssues,
      restRecordCount: 0,
      graphqlRecordCount: 0,
      fieldMismatches: [],
      tableResults: []
    };
  }

  // Extract GraphQL response structure
  let graphqlData: Record<string, unknown> = {};
  try {
    const response = graphqlResponse as Record<string, unknown>;
    if (response?.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      if (data.GlideRecord_Query && typeof data.GlideRecord_Query === 'object') {
        graphqlData = data.GlideRecord_Query as Record<string, unknown>;
      }
    }
  } catch (error) {
    aggregatedIssues.push('Failed to parse GraphQL response structure');
    logger.error('Error parsing GraphQL multi-table response', 'dataComparison', { graphqlResponse }, error as Error);
  }

  // Track which tables we've already processed to handle duplicates
  const processedTables = new Set<string>();
  
  // Compare each table independently
  for (let i = 0; i < restCalls.length; i++) {
    const restCall = restCalls[i];
    const restResponse = restResponses[i];
    const tableName = restCall.table;
    const expectedFields = restCall.fields;

    // Extract REST records for this table
    const restRecords = extractRestRecords(restResponse);
    const restRecordCount = restRecords.length;
    totalRestRecords += restRecordCount;

    // Find corresponding GraphQL data by table name
    let graphqlRecords: Record<string, unknown>[] = [];
    let graphqlRecordCount = 0;

    // For multi-table scenarios, GraphQL might combine results for the same table
    // We'll use the first occurrence for comparison
    if (graphqlData[tableName] && typeof graphqlData[tableName] === 'object') {
      const tableData = graphqlData[tableName] as Record<string, unknown>;
      if (Array.isArray(tableData._results)) {
        graphqlRecords = tableData._results;
      }
    }

    graphqlRecordCount = graphqlRecords.length;
    totalGraphqlRecords += graphqlRecordCount;

    // Check for duplicate table names in the query
    const tableIdentifier = `${tableName}_${i}`; // Include index for uniqueness
    const tableWarnings: string[] = [];
    
    if (processedTables.has(tableName)) {
      tableWarnings.push(`Table ${tableName} appears multiple times in query - GraphQL results may be combined`);
    }
    processedTables.add(tableName);

    // Compare this table's data using existing comparison logic
    const tableComparison = compareTableData(
      restRecords,
      graphqlRecords,
      expectedFields,
      tableIdentifier
    );

    // Aggregate results
    totalComparisons += tableComparison.totalComparisons;
    totalMatchingComparisons += tableComparison.matchingComparisons;
    
    // Add table-specific field mismatches to aggregated list
    aggregatedFieldMismatches.push(...tableComparison.fieldMismatches);

    // Combine table warnings with comparison issues
    const allTableIssues = [...tableWarnings, ...tableComparison.issues];

    // Store table-specific results
    tableResults.push({
      tableName: tableIdentifier, // Use unique identifier
      restRecordCount,
      graphqlRecordCount,
      dataConsistency: tableComparison.dataConsistency,
      fieldMismatches: tableComparison.fieldMismatches,
      issues: allTableIssues
    });

    // Add table-specific issues to aggregated issues
    if (allTableIssues.length > 0) {
      aggregatedIssues.push(`Table ${tableIdentifier}: ${allTableIssues.join(', ')}`);
    }
  }

  // Calculate overall metrics
  const recordCountMatch = totalRestRecords === totalGraphqlRecords;
  if (!recordCountMatch) {
    aggregatedIssues.push(`Overall record count mismatch: REST returned ${totalRestRecords}, GraphQL returned ${totalGraphqlRecords}`);
  }

  let dataConsistency: number;
  if (totalComparisons === 0) {
    dataConsistency = 0;
  } else if (aggregatedFieldMismatches.length === 0) {
    dataConsistency = 100;
  } else {
    dataConsistency = Math.floor((totalMatchingComparisons / totalComparisons) * 100);
  }

  // Check if all field mismatches across all tables are only known issues (warnings)
  const totalWarnings = aggregatedFieldMismatches.filter(m => m.isWarning).length;
  const totalErrors = aggregatedFieldMismatches.filter(m => !m.isWarning).length;
  const onlyKnownIssues = aggregatedFieldMismatches.length > 0 && totalErrors === 0;

  const isEquivalent = recordCountMatch && aggregatedFieldMismatches.length === 0 && dataConsistency === 100;

  if (dataConsistency < 100) {
    aggregatedIssues.push(`Overall data consistency: ${dataConsistency}% (${totalMatchingComparisons}/${totalComparisons} field comparisons matched)`);
  }

  if (aggregatedFieldMismatches.length > 0) {
    if (totalErrors > 0) {
      aggregatedIssues.push(`${totalErrors} total field mismatches found across all tables`);
    }
    if (totalWarnings > 0) {
      aggregatedIssues.push(`${totalWarnings} total reference field format differences (known issue) across all tables`);
    }
  }

  // Log performance metrics for multi-table comparison
  logger.logPerformanceMetric('multiTable_comparison_tables', restCalls.length, 'count', 'dataComparison');
  logger.logPerformanceMetric('multiTable_comparison_totalComparisons', totalComparisons, 'count', 'dataComparison');
  logger.logPerformanceMetric('multiTable_comparison_matchingRate', totalMatchingComparisons / totalComparisons * 100, '%', 'dataComparison');

  return {
    isEquivalent,
    recordCountMatch,
    dataConsistency,
    issues: aggregatedIssues,
    restRecordCount: totalRestRecords,
    graphqlRecordCount: totalGraphqlRecords,
    fieldMismatches: aggregatedFieldMismatches,
    tableResults,
    onlyKnownIssues
  };
}

// Helper function to compare data for a single table
function compareTableData(
  restRecords: Record<string, unknown>[],
  graphqlRecords: Record<string, unknown>[],
  expectedFields: string[],
  tableIdentifier: string
): {
  totalComparisons: number;
  matchingComparisons: number;
  dataConsistency: number;
  fieldMismatches: Array<{
    recordIndex: number;
    field: string;
    restValue: unknown;
    graphqlValue: unknown;
    isWarning?: boolean;
  }>;
  issues: string[];
} {
  const issues: string[] = [];
  const fieldMismatches: Array<{
    recordIndex: number;
    field: string;
    restValue: unknown;
    graphqlValue: unknown;
    isWarning?: boolean;
  }> = [];

  // If no records in either, consider equivalent
  if (restRecords.length === 0 && graphqlRecords.length === 0) {
    return {
      totalComparisons: 0,
      matchingComparisons: 0,
      dataConsistency: 100,
      fieldMismatches: [],
      issues: []
    };
  }

  // Use optimized sorting with caching
  const sortedRestRecords = getSortedRecords(restRecords, false);
  const sortedGraphqlRecords = getSortedRecords(graphqlRecords, true);

  let totalComparisons = 0;
  let matchingComparisons = 0;

  // Compare records
  const minRecordCount = Math.min(sortedRestRecords.length, sortedGraphqlRecords.length);
  const maxMismatches = 50; // Limit mismatches per table to prevent memory issues

  for (let i = 0; i < minRecordCount; i++) {
    const restRecord = sortedRestRecords[i];
    const graphqlRecord = sortedGraphqlRecords[i];

    // Compare each expected field
    for (const field of expectedFields) {
      totalComparisons++;
      const restValue = normalizeValue(restRecord[field]);
      const graphqlValue = normalizeValue(extractNestedGraphQLValue(graphqlRecord, field));

      if (restValue === graphqlValue) {
        matchingComparisons++;
      } else {
        // Check for known REST reference field format issue
        const isReferenceFormatIssue = isKnownReferenceFieldFormatDifference(restValue, graphqlValue);
        
        if (isReferenceFormatIssue) {
          // Treat as matching for consistency calculation
          matchingComparisons++;
          // But add as warning instead of error
          if (fieldMismatches.length < maxMismatches) {
            fieldMismatches.push({
              recordIndex: i,
              field,
              restValue,
              graphqlValue,
              isWarning: true
            });
          }
        } else {
          // Limit the number of mismatches per table
          if (fieldMismatches.length < maxMismatches) {
            fieldMismatches.push({
              recordIndex: i,
              field,
              restValue,
              graphqlValue
            });
          }
        }
      }
    }
  }

  // Calculate consistency for this table
  let dataConsistency: number;
  if (totalComparisons === 0) {
    dataConsistency = 0;
  } else if (fieldMismatches.length === 0) {
    dataConsistency = 100;
  } else {
    dataConsistency = Math.floor((matchingComparisons / totalComparisons) * 100);
  }

  return {
    totalComparisons,
    matchingComparisons,
    dataConsistency,
    fieldMismatches,
    issues
  };
}

export function compareApiResponses(
  restResponse: unknown,
  graphqlResponse: unknown,
  tableName: string,
  expectedFields: string[]
): DataComparisonResult {
  const issues: string[] = [];
  const fieldMismatches: Array<{
    recordIndex: number;
    field: string;
    restValue: unknown;
    graphqlValue: unknown;
    isWarning?: boolean;
  }> = [];

  // Extract records from both responses
  const restRecords = extractRestRecords(restResponse);
  const graphqlRecords = extractGraphQLRecords(graphqlResponse, tableName);

  const restRecordCount = restRecords.length;
  const graphqlRecordCount = graphqlRecords.length;
  const recordCountMatch = restRecordCount === graphqlRecordCount;

  if (!recordCountMatch) {
    issues.push(`Record count mismatch: REST returned ${restRecordCount}, GraphQL returned ${graphqlRecordCount}`);
  }

  // If no records in either, consider equivalent
  if (restRecordCount === 0 && graphqlRecordCount === 0) {
    return {
      isEquivalent: true,
      recordCountMatch: true,
      dataConsistency: 100,
      issues: [],
      restRecordCount: 0,
      graphqlRecordCount: 0,
      fieldMismatches: []
    };
  }

  // Use optimized sorting with caching
  const sortedRestRecords = getSortedRecords(restRecords, false);
  const sortedGraphqlRecords = getSortedRecords(graphqlRecords, true);

  let totalComparisons = 0;
  let matchingComparisons = 0;

  // Optimized record comparison with early termination
  const minRecordCount = Math.min(sortedRestRecords.length, sortedGraphqlRecords.length);
  const maxMismatches = 100; // Limit mismatches to prevent memory issues
  
  // Use performance measurement
  const comparisonResult = logger.measurePerformance('recordComparison', () => {
    for (let i = 0; i < minRecordCount; i++) {
      const restRecord = sortedRestRecords[i];
      const graphqlRecord = sortedGraphqlRecords[i];

      // Compare each expected field
      for (const field of expectedFields) {
        totalComparisons++;
        const restValue = normalizeValue(restRecord[field]);
        const graphqlValue = normalizeValue(extractNestedGraphQLValue(graphqlRecord, field));

        if (restValue === graphqlValue) {
          matchingComparisons++;
        } else {
          // Check for known REST reference field format issue
          const isReferenceFormatIssue = isKnownReferenceFieldFormatDifference(restValue, graphqlValue);
          
          if (isReferenceFormatIssue) {
            // Treat as matching for consistency calculation
            matchingComparisons++;
            // But add as warning instead of error
            if (fieldMismatches.length < maxMismatches) {
              fieldMismatches.push({
                recordIndex: i,
                field,
                restValue,
                graphqlValue,
                isWarning: true
              });
            }
          } else {
            // Limit the number of mismatches to prevent memory issues
            if (fieldMismatches.length < maxMismatches) {
              fieldMismatches.push({
                recordIndex: i,
                field,
                restValue,
                graphqlValue
              });
            }
          }
        }
      }
    }
  }, 'dataComparison');

  // Use more precise calculation - if there are any mismatches, don't round up to 100%
  let dataConsistency: number;
  if (totalComparisons === 0) {
    dataConsistency = 0;
  } else if (fieldMismatches.length === 0) {
    dataConsistency = 100;
  } else {
    // Use floor instead of round to ensure that any mismatches prevent 100%
    dataConsistency = Math.floor((matchingComparisons / totalComparisons) * 100);
  }
  
  // Check if all field mismatches are only known issues (warnings)
  const warnings = fieldMismatches.filter(m => m.isWarning);
  const errors = fieldMismatches.filter(m => !m.isWarning);
  const onlyKnownIssues = fieldMismatches.length > 0 && errors.length === 0;

  // isEquivalent should be false if there are any field mismatches
  const isEquivalent = recordCountMatch && fieldMismatches.length === 0 && dataConsistency === 100;

  if (dataConsistency < 100) {
    issues.push(`Data consistency: ${dataConsistency}% (${matchingComparisons}/${totalComparisons} field comparisons matched)`);
  }

  if (fieldMismatches.length > 0) {
    if (errors.length > 0) {
      issues.push(`${errors.length} field mismatches found`);
    }
    if (warnings.length > 0) {
      issues.push(`${warnings.length} reference field format differences (known issue)`);
    }
  }

  const result = {
    isEquivalent,
    recordCountMatch,
    dataConsistency,
    issues,
    restRecordCount,
    graphqlRecordCount,
    fieldMismatches,
    onlyKnownIssues
  };
  
  // Log performance metrics
  logger.logPerformanceMetric('dataComparison_totalComparisons', totalComparisons, 'count', 'dataComparison');
  logger.logPerformanceMetric('dataComparison_matchingRate', matchingComparisons / totalComparisons * 100, '%', 'dataComparison');
  
  return result;
}