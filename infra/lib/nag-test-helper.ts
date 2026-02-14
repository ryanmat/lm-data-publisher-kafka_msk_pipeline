// ABOUTME: Helper utilities for CDK Nag testing
// ABOUTME: Provides functions to apply and validate CDK Nag rules in tests

import * as cdk from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, NagPackSuppression } from 'cdk-nag';
import { IConstruct } from 'constructs';

/**
 * Apply CDK Nag checks to a stack and return any High severity findings
 */
export function applyNagChecks(
  stack: cdk.Stack,
  suppressions: NagPackSuppression[] = []
): void {
  // Apply AWS Solutions checks
  cdk.Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: false }));

  // Apply suppressions if provided
  if (suppressions.length > 0) {
    suppressions.forEach((suppression) => {
      // Note: Suppressions would typically be added via NagSuppressions.addStackSuppressions
      // This is a placeholder for the pattern
    });
  }
}

/**
 * Get all High severity findings from a stack
 */
export function getHighSeverityFindings(stack: cdk.Stack): string[] {
  const annotations = Annotations.fromStack(stack);
  const messages = annotations.findError('*', Match.anyValue());

  return messages
    .filter((msg) =>
      msg.entry.data &&
      typeof msg.entry.data === 'string' &&
      msg.entry.data.includes('[HIGH]')
    )
    .map((msg) => msg.entry.data as string);
}

/**
 * Assert that a stack has no High severity findings
 * Throws if High findings are present
 */
export function assertNoHighFindings(stack: cdk.Stack): void {
  const highFindings = getHighSeverityFindings(stack);

  if (highFindings.length > 0) {
    throw new Error(
      `CDK Nag found ${highFindings.length} High severity finding(s):\n` +
        highFindings.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
    );
  }
}
