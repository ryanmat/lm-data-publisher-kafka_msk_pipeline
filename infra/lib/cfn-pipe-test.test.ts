// ABOUTME: Verification test for CfnPipe availability
// ABOUTME: Confirms aws-cdk-lib includes EventBridge Pipes L1 constructs

import * as cdk from 'aws-cdk-lib';
import * as pipes from 'aws-cdk-lib/aws-pipes';

describe('CfnPipe Availability', () => {
  test('CfnPipe is available from aws-cdk-lib', () => {
    // Verify CfnPipe class exists
    expect(pipes.CfnPipe).toBeDefined();
    expect(typeof pipes.CfnPipe).toBe('function');
  });

  test('Can instantiate CfnPipe construct', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    // Create a minimal CfnPipe (will fail validation but proves it's available)
    const pipe = new pipes.CfnPipe(stack, 'TestPipe', {
      roleArn: 'arn:aws:iam::123456789012:role/test-role',
      source: 'arn:aws:kafka:us-west-2:123456789012:cluster/test/abc',
      target: 'arn:aws:lambda:us-west-2:123456789012:function:test',
    });

    expect(pipe).toBeDefined();
    expect(pipe.roleArn).toBe('arn:aws:iam::123456789012:role/test-role');
  });

  test('CfnPipe supports MSK source configuration', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const pipe = new pipes.CfnPipe(stack, 'TestPipe', {
      roleArn: 'arn:aws:iam::123456789012:role/test-role',
      source: 'arn:aws:kafka:us-west-2:123456789012:cluster/test/abc',
      target: 'arn:aws:lambda:us-west-2:123456789012:function:test',
      sourceParameters: {
        managedStreamingKafkaParameters: {
          topicName: 'lm.metrics.otlp',
          startingPosition: 'TRIM_HORIZON',
          batchSize: 100,
        },
      },
    });

    expect(pipe.sourceParameters).toBeDefined();
  });

  test('CfnPipe supports Lambda target configuration', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const pipe = new pipes.CfnPipe(stack, 'TestPipe', {
      roleArn: 'arn:aws:iam::123456789012:role/test-role',
      source: 'arn:aws:kafka:us-west-2:123456789012:cluster/test/abc',
      target: 'arn:aws:lambda:us-west-2:123456789012:function:test',
      targetParameters: {
        lambdaFunctionParameters: {
          invocationType: 'REQUEST_RESPONSE',
        },
      },
    });

    expect(pipe.targetParameters).toBeDefined();
  });
});
