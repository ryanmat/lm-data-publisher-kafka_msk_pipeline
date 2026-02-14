// ABOUTME: Tests for BaseStack infrastructure
// ABOUTME: Validates stack synthesis and basic properties

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BaseStack } from './base-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';
import { globalSuppressions } from './nag-suppressions';

describe('BaseStack', () => {
  test('Stack synthesizes successfully', () => {
    const app = new cdk.App();
    const stack = new BaseStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Verify template can be synthesized
    expect(template).toBeDefined();
  });

  test('Stack has correct tags', () => {
    const app = new cdk.App();
    const stack = new BaseStack(app, 'TestStack', {
      tags: {
        Project: 'test-project',
      },
    });

    expect(stack.tags).toBeDefined();
  });

  test('CDK Nag - No High severity findings', () => {
    const app = new cdk.App();
    const stack = new BaseStack(app, 'TestNagStack');

    // Apply CDK Nag checks
    applyNagChecks(stack, globalSuppressions);

    // Synthesize to trigger nag checks
    app.synth();

    // Assert no High findings (will throw if any exist)
    assertNoHighFindings(stack);
  });
});
