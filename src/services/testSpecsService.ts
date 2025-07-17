// Service for processing and managing test specifications
import { testSpecs } from '../specs/testSpecs';
import { buildRestUrl, buildGraphQLQuery, buildStructuredGraphQLQuery } from '../utils/apiBuilders';

export interface ProcessedTestSpec {
  id: string;
  name: string;
  description: string;
  category: string;
  variant: string;
  complexity: 'low' | 'medium' | 'high';
  restEndpoint: string;
  graphqlQuery: string;
  expectedFields: string[];
  graphqlFields: Record<string, any>;
  dotWalkingDepth: number;
  recordLimits: number[];
  table: string;
  filter?: string;
  restCalls?: Array<{
    table: string;
    fields: string[];
    filter?: string;
  }>;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  count: number;
}

export class TestSpecsService {
  static processTestSpecs(): ProcessedTestSpec[] {
    const processed: ProcessedTestSpec[] = [];
    
    Object.entries(testSpecs).forEach(([categoryKey, category]) => {
      Object.entries(category).forEach(([variantKey, variant]) => {
        // Handle different test spec structures
        if (variant.tests) {
          // Single table tests (dotWalkingTests, schemaTailoringTests)
          variant.tests.forEach((test, index) => {
            processed.push({
              id: `${categoryKey}_${variantKey}_${index}`,
              name: test.name,
              description: variant.description || '',
              category: categoryKey,
              variant: variantKey,
              complexity: this.calculateComplexity(test.restFields || [], test.graphqlFields || {}),
              restEndpoint: this.buildRestEndpoint(test.restFields || [], variant.table || ''),
              graphqlQuery: this.buildGraphQLQuery(test.graphqlFields || {}, variant.table || ''),
              expectedFields: test.restFields || [],
              graphqlFields: test.graphqlFields || {},
              dotWalkingDepth: this.calculateDotWalkingDepth(test.restFields || []),
              recordLimits: variant.recordLimits || [50],
              table: variant.table || '',
              filter: test.filter
            });
          });
        } else if (variant.scenarios) {
          // Multi-table tests or scenario-based tests
          variant.scenarios.forEach((scenario, index) => {
            processed.push({
              id: `${categoryKey}_${variantKey}_${index}`,
              name: scenario.name,
              description: variant.description || '',
              category: categoryKey,
              variant: variantKey,
              complexity: this.calculateComplexityFromScenario(scenario),
              restEndpoint: this.buildRestEndpointFromScenario(scenario),
              graphqlQuery: this.buildGraphQLQueryFromScenario(scenario),
              expectedFields: scenario.restFields || this.extractFieldsFromRestCalls(scenario.restCalls),
              graphqlFields: scenario.graphqlFields || {},
              dotWalkingDepth: this.calculateDotWalkingDepth(scenario.restFields || this.extractFieldsFromRestCalls(scenario.restCalls)),
              recordLimits: variant.recordLimits || [50],
              table: scenario.table || variant.table || '',
              filter: scenario.filter,
              restCalls: scenario.restCalls
            });
          });
        }
      });
    });
    
    return processed;
  }
  
  static getCategoryInfo(): CategoryInfo[] {
    const categoryMap = {
      dotWalkingTests: {
        id: 'dotWalkingTests',
        name: 'Dot-Walking Tests',
        description: 'Relationship traversal performance tests',
        icon: '🚀',
        color: 'purple'
      },
      multiTableTests: {
        id: 'multiTableTests',
        name: 'Multi-Table Tests',
        description: 'Single GraphQL query vs multiple REST calls',
        icon: '📊',
        color: 'blue'
      },
      schemaTailoringTests: {
        id: 'schemaTailoringTests',
        name: 'Schema Tailoring',
        description: 'Precise data fetching scenarios',
        icon: '📱',
        color: 'green'
      },
      performanceScaleTests: {
        id: 'performanceScaleTests',
        name: 'Performance Scale',
        description: 'High-volume performance tests',
        icon: '⚡',
        color: 'yellow'
      },
      realWorldScenarios: {
        id: 'realWorldScenarios',
        name: 'Real-World Scenarios',
        description: 'Practical developer use cases',
        icon: '🌟',
        color: 'orange'
      }
    };
    
    const specs = this.processTestSpecs();
    const categoryCounts = specs.reduce((acc, spec) => {
      acc[spec.category] = (acc[spec.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryMap).map(([key, info]) => ({
      ...info,
      count: categoryCounts[key] || 0
    }));
  }
  
  private static calculateComplexity(restFields: string[], graphqlFields: Record<string, any>): 'low' | 'medium' | 'high' {
    const fieldCount = restFields.length;
    const dotWalkingFields = restFields.filter(f => f.includes('.')).length;
    const graphqlDepth = this.calculateGraphQLDepth(graphqlFields);
    
    if (fieldCount > 15 || dotWalkingFields > 5 || graphqlDepth > 3) return 'high';
    if (fieldCount > 8 || dotWalkingFields > 2 || graphqlDepth > 2) return 'medium';
    return 'low';
  }
  
  private static calculateComplexityFromScenario(scenario: any): 'low' | 'medium' | 'high' {
    if (scenario.restCalls) {
      const totalFields = scenario.restCalls.reduce((sum: number, call: any) => sum + call.fields.length, 0);
      const dotWalkingFields = scenario.restCalls.reduce((sum: number, call: any) => 
        sum + call.fields.filter((f: string) => f.includes('.')).length, 0);
      
      if (totalFields > 20 || dotWalkingFields > 8 || scenario.restCalls.length > 4) return 'high';
      if (totalFields > 12 || dotWalkingFields > 4 || scenario.restCalls.length > 2) return 'medium';
      return 'low';
    }
    
    return this.calculateComplexity(scenario.restFields || [], scenario.graphqlFields || {});
  }
  
  
  private static calculateGraphQLDepth(fields: Record<string, any>, currentDepth: number = 0): number {
    let maxDepth = currentDepth;
    
    Object.values(fields).forEach(value => {
      if (typeof value === 'object' && value !== null) {
        if (value._reference) {
          const refDepth = this.calculateGraphQLDepth(value._reference, currentDepth + 1);
          maxDepth = Math.max(maxDepth, refDepth);
        }
      }
    });
    
    return maxDepth;
  }
  
  private static buildRestEndpoint(fields: string[], table: string): string {
    if (!table || !fields.length) return '';
    
    const fieldsParam = fields.join(',');
    return `/api/now/table/${table}?sysparm_fields=${fieldsParam}&sysparm_limit=100`;
  }
  
  private static buildRestEndpointFromScenario(scenario: any): string {
    if (scenario.restCalls) {
      return scenario.restCalls.map((call: any) => 
        `/api/now/table/${call.table}?sysparm_fields=${call.fields.join(',')}&sysparm_limit=100${call.filter ? `&sysparm_query=${call.filter}` : ''}`
      ).join('\n');
    }
    
    return this.buildRestEndpoint(scenario.restFields || [], scenario.table || '');
  }
  
  private static buildGraphQLQuery(fields: Record<string, any>, table: string): string {
    if (!table || !Object.keys(fields).length) return '';
    
    const formattedFields = this.formatGraphQLFields(fields);
    return `query {
  GlideRecord_Query {
    ${table}(limit: 100) {
      _results {
${formattedFields}
      }
    }
  }
}`;
  }
  
  private static buildGraphQLQueryFromScenario(scenario: any): string {
    // Check if scenario has new structured graphqlFields format
    if (scenario.graphqlFields && Object.values(scenario.graphqlFields).some((value: any) => 
      value && typeof value === 'object' && 'table' in value && 'fields' in value
    )) {
      // Use new structured GraphQL query builder
      const result = buildStructuredGraphQLQuery({
        graphqlFields: scenario.graphqlFields,
        limit: 100
      });
      return result.query;
    }
    
    // Legacy support for restCalls
    if (scenario.restCalls) {
      const tableQueries = scenario.restCalls.map((call: any) => {
        const fields = call.fields.map((field: string) => `        ${field}`).join('\n');
        return `    ${call.table}(limit: 100${call.filter ? `, filter: "${call.filter}"` : ''}) {
      _results {
${fields}
      }
    }`;
      }).join('\n');
      
      return `query {
  GlideRecord_Query {
${tableQueries}
  }
}`;
    }
    
    return this.buildGraphQLQuery(scenario.graphqlFields || {}, scenario.table || '');
  }
  
  private static formatGraphQLFields(fields: Record<string, any>, depth: number = 0): string {
    const indent = '  '.repeat(depth + 4);
    let result = '';
    
    Object.entries(fields).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value._reference) {
          result += `${indent}${key} {\n`;
          result += `${indent}  _reference {\n`;
          result += this.formatGraphQLFields(value._reference, depth + 2);
          result += `${indent}  }\n`;
          result += `${indent}}\n`;
        } else {
          result += `${indent}${key} {\n`;
          if (value.value) result += `${indent}  value\n`;
          if (value.displayValue) result += `${indent}  displayValue\n`;
          result += `${indent}}\n`;
        }
      } else {
        result += `${indent}${key}\n`;
      }
    });
    
    return result;
  }
  
  private static calculateDotWalkingDepth(fields: string[]): number {
    return Math.max(0, ...fields.map(field => (field.match(/\./g) || []).length));
  }
  
  private static extractFieldsFromRestCalls(restCalls: any[]): string[] {
    if (!restCalls) return [];
    
    return restCalls.reduce((acc: string[], call: any) => {
      return acc.concat(call.fields || []);
    }, []);
  }
}