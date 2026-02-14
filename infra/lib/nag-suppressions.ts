// ABOUTME: CDK Nag suppressions for known acceptable violations
// ABOUTME: Documents why specific security findings are suppressed

import { NagPackSuppression } from 'cdk-nag';

/**
 * Global suppressions that apply across all stacks
 * Only add suppressions here with clear justification
 */
export const globalSuppressions: NagPackSuppression[] = [
  // Add suppressions here as needed with detailed reasons
  // Example:
  // {
  //   id: 'AwsSolutions-IAM4',
  //   reason: 'AWS managed policies are acceptable for Lambda execution roles in this demo'
  // }
];
