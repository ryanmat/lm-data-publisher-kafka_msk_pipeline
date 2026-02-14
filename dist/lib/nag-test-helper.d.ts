import * as cdk from 'aws-cdk-lib';
import { NagPackSuppression } from 'cdk-nag';
/**
 * Apply CDK Nag checks to a stack and return any High severity findings
 */
export declare function applyNagChecks(stack: cdk.Stack, suppressions?: NagPackSuppression[]): void;
/**
 * Get all High severity findings from a stack
 */
export declare function getHighSeverityFindings(stack: cdk.Stack): string[];
/**
 * Assert that a stack has no High severity findings
 * Throws if High findings are present
 */
export declare function assertNoHighFindings(stack: cdk.Stack): void;
