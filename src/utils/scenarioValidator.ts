// Comprehensive validation utility for all multi-table scenarios
// This ensures production readiness and identifies potential issues

import { testSpecs } from '../specs/testSpecs';
import { validateMultiTableScenario } from './apiBuilders';

interface ScenarioValidationReport {
  scenarioName: string;
  categoryName: string;
  variantName: string;
  valid: boolean;
  errors: Array<{field: string; message: string; value?: unknown}>;
  warnings: string[];
  complexityScore: number;
  tableCount: number;
  totalFields: number;
  dotWalkingFields: number;
}

interface ValidationSummary {
  totalScenarios: number;
  validScenarios: number;
  failedScenarios: number;
  highComplexityScenarios: number;
  reports: ScenarioValidationReport[];
  overallStatus: 'READY' | 'WARNING' | 'FAILED';
}

// Extract all multi-table scenarios from testSpecs
function extractMultiTableScenarios(): Array<{
  categoryName: string;
  variantName: string;
  scenario: {
    name: string;
    restCalls: Array<{table: string; fields: string[]; filter?: string}>;
  };
}> {
  const scenarios: Array<{
    categoryName: string;
    variantName: string;
    scenario: {
      name: string;
      restCalls: Array<{table: string; fields: string[]; filter?: string}>;
    };
  }> = [];

  // Check multiTableTests
  Object.entries(testSpecs.multiTableTests).forEach(([variantName, variant]) => {
    if (variant.scenarios) {
      variant.scenarios.forEach(scenario => {
        if (scenario.restCalls && scenario.restCalls.length > 0) {
          scenarios.push({
            categoryName: 'multiTableTests',
            variantName,
            scenario: {
              name: scenario.name,
              restCalls: scenario.restCalls
            }
          });
        }
      });
    }
  });

  // Check schemaTailoringTests
  Object.entries(testSpecs.schemaTailoringTests).forEach(([variantName, variant]) => {
    if (variant.scenarios) {
      variant.scenarios.forEach(scenario => {
        if (scenario.restCalls && scenario.restCalls.length > 0) {
          scenarios.push({
            categoryName: 'schemaTailoringTests',
            variantName,
            scenario: {
              name: scenario.name,
              restCalls: scenario.restCalls
            }
          });
        }
      });
    }
  });

  // Check performanceScaleTests
  Object.entries(testSpecs.performanceScaleTests).forEach(([variantName, variant]) => {
    if (variant.scenarios) {
      variant.scenarios.forEach(scenario => {
        if (scenario.restCalls && scenario.restCalls.length > 0) {
          scenarios.push({
            categoryName: 'performanceScaleTests',
            variantName,
            scenario: {
              name: scenario.name,
              restCalls: scenario.restCalls
            }
          });
        }
      });
    }
  });

  // Check realWorldScenarios
  Object.entries(testSpecs.realWorldScenarios).forEach(([variantName, variant]) => {
    if (variant.scenarios) {
      variant.scenarios.forEach(scenario => {
        if (scenario.restCalls && scenario.restCalls.length > 0) {
          scenarios.push({
            categoryName: 'realWorldScenarios',
            variantName,
            scenario: {
              name: scenario.name,
              restCalls: scenario.restCalls
            }
          });
        }
      });
    }
  });

  return scenarios;
}

// Comprehensive validation function
export function validateAllMultiTableScenarios(): ValidationSummary {
  const scenarios = extractMultiTableScenarios();
  const reports: ScenarioValidationReport[] = [];
  
  let validCount = 0;
  let failedCount = 0;
  let highComplexityCount = 0;

  scenarios.forEach(({ categoryName, variantName, scenario }) => {
    const validation = validateMultiTableScenario(scenario);
    
    const tableCount = scenario.restCalls.length;
    const totalFields = scenario.restCalls.reduce((sum, call) => sum + call.fields.length, 0);
    const dotWalkingFields = scenario.restCalls.reduce((sum, call) => 
      sum + call.fields.filter(field => field.includes('.')).length, 0
    );

    const report: ScenarioValidationReport = {
      scenarioName: scenario.name,
      categoryName,
      variantName,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      complexityScore: validation.complexityScore,
      tableCount,
      totalFields,
      dotWalkingFields
    };

    reports.push(report);

    if (validation.valid) {
      validCount++;
    } else {
      failedCount++;
    }

    if (validation.complexityScore > 300) {
      highComplexityCount++;
    }
  });

  // Determine overall status
  let overallStatus: 'READY' | 'WARNING' | 'FAILED' = 'READY';
  if (failedCount > 0) {
    overallStatus = 'FAILED';
  } else if (highComplexityCount > scenarios.length * 0.3) { // More than 30% high complexity
    overallStatus = 'WARNING';
  }

  return {
    totalScenarios: scenarios.length,
    validScenarios: validCount,
    failedScenarios: failedCount,
    highComplexityScenarios: highComplexityCount,
    reports,
    overallStatus
  };
}

// Generate detailed validation report
export function generateValidationReport(): string {
  const summary = validateAllMultiTableScenarios();
  
  let report = `
╔════════════════════════════════════════════════════════════════════╗
║                    MULTI-TABLE SCENARIO VALIDATION REPORT          ║
╠════════════════════════════════════════════════════════════════════╣
║ Status: ${summary.overallStatus.padEnd(58)} ║
║ Total Scenarios: ${summary.totalScenarios.toString().padEnd(51)} ║
║ Valid Scenarios: ${summary.validScenarios.toString().padEnd(51)} ║
║ Failed Scenarios: ${summary.failedScenarios.toString().padEnd(50)} ║
║ High Complexity: ${summary.highComplexityScenarios.toString().padEnd(51)} ║
╚════════════════════════════════════════════════════════════════════╝

`;

  // Failed scenarios section
  if (summary.failedScenarios > 0) {
    report += `
🚨 FAILED SCENARIOS:
`;
    summary.reports.filter(r => !r.valid).forEach(report_item => {
      report += `
❌ ${report_item.categoryName}.${report_item.variantName}.${report_item.scenarioName}
   Errors:
`;
      report_item.errors.forEach(error => {
        report += `   - ${error.field}: ${error.message}\n`;
      });
    });
  }

  // High complexity warnings
  if (summary.highComplexityScenarios > 0) {
    report += `
⚠️  HIGH COMPLEXITY SCENARIOS:
`;
    summary.reports.filter(r => r.complexityScore > 300).forEach(report_item => {
      report += `
🔥 ${report_item.categoryName}.${report_item.variantName}.${report_item.scenarioName}
   Complexity Score: ${report_item.complexityScore} (${report_item.tableCount} tables, ${report_item.totalFields} fields)
   Warnings:
`;
      report_item.warnings.forEach(warning => {
        report += `   - ${warning}\n`;
      });
    });
  }

  // Detailed scenario breakdown
  report += `
📊 DETAILED SCENARIO BREAKDOWN:
`;
  summary.reports.forEach(report_item => {
    const status = report_item.valid ? '✅' : '❌';
    const complexity = report_item.complexityScore > 300 ? '🔥' : report_item.complexityScore > 150 ? '⚠️' : '✅';
    
    report += `
${status} ${report_item.categoryName}.${report_item.variantName}.${report_item.scenarioName}
   ${complexity} Complexity: ${report_item.complexityScore} | Tables: ${report_item.tableCount} | Fields: ${report_item.totalFields} | Dot-walking: ${report_item.dotWalkingFields}
`;
  });

  return report;
}

// Export for use in development and testing
export { extractMultiTableScenarios };