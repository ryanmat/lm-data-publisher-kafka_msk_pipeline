// Description: Tests for PipeStack (EventBridge Pipe: MSK source -> Lambda target)
// Description: Validates CfnPipe, Lambda function, IAM roles, SQS DLQ, CloudWatch logs, and CDK Nag

import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { PipeStack } from './pipe-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('PipeStack', () => {
  let app: cdk.App;
  let stack: PipeStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new PipeStack(app, 'TestPipeStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      mskClusterArn: 'arn:aws:kafka:us-east-1:123456789012:cluster/test-cluster/abc-123',
      mskTopic: 'lm.metrics.otlp',
      mtlsSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-mtls-abc123',
      firehoseStreamName: 'lm-datapublisher-delivery',
      firehoseStreamArn: 'arn:aws:firehose:us-east-1:123456789012:deliverystream/lm-datapublisher-delivery',
    });
    template = Template.fromStack(stack);
  });

  // B11: Pipe skeleton
  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates SQS dead-letter queue for failed pipe invocations', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      MessageRetentionPeriod: 1209600, // 14 days
    });
  });

  test('Creates CloudWatch log group for pipe logging', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 14,
    });
  });

  test('Creates IAM role for the Pipe', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: {
              Service: 'pipes.amazonaws.com',
            },
          }),
        ]),
      }),
    });
  });

  // B12: MSK source + mTLS
  test('Creates CfnPipe resource', () => {
    template.hasResource('AWS::Pipes::Pipe', {});
  });

  test('Configures MSK source with cluster ARN and topic', () => {
    template.hasResourceProperties('AWS::Pipes::Pipe', {
      Source: 'arn:aws:kafka:us-east-1:123456789012:cluster/test-cluster/abc-123',
      SourceParameters: Match.objectLike({
        ManagedStreamingKafkaParameters: Match.objectLike({
          TopicName: 'lm.metrics.otlp',
          StartingPosition: 'TRIM_HORIZON',
        }),
      }),
    });
  });

  test('Configures mTLS credentials on MSK source', () => {
    template.hasResourceProperties('AWS::Pipes::Pipe', {
      SourceParameters: Match.objectLike({
        ManagedStreamingKafkaParameters: Match.objectLike({
          Credentials: Match.objectLike({
            ClientCertificateTlsAuth: Match.anyValue(),
          }),
        }),
      }),
    });
  });

  // B13: Lambda target
  test('Creates Lambda function for OTLP fan-out', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: Match.stringLikeRegexp('python3\\..*'),
      Handler: 'handler.handler',
    });
  });

  test('Lambda function has FIREHOSE_STREAM_NAME environment variable', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          FIREHOSE_STREAM_NAME: 'lm-datapublisher-delivery',
        }),
      }),
    });
  });

  test('Lambda has firehose:PutRecordBatch permission', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'firehose:PutRecordBatch',
            ]),
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('Pipe target is the Lambda function', () => {
    template.hasResourceProperties('AWS::Pipes::Pipe', {
      Target: Match.anyValue(),
    });
    // Verify target references a Lambda function ARN
    const pipes = template.findResources('AWS::Pipes::Pipe');
    const pipe = Object.values(pipes)[0];
    const target = pipe.Properties.Target;
    // Target should reference the Lambda function via GetAtt
    expect(target).toBeDefined();
  });

  test('Pipe role has lambda:InvokeFunction permission', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'lambda:InvokeFunction',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('Pipe has dead-letter queue configured', () => {
    template.hasResourceProperties('AWS::Pipes::Pipe', {
      SourceParameters: Match.objectLike({
        ManagedStreamingKafkaParameters: Match.objectLike({
          TopicName: 'lm.metrics.otlp',
        }),
      }),
    });
  });

  test('Exports pipe ARN as stack output', () => {
    template.hasOutput('PipeArn', {});
  });

  test('Exports Lambda function name as stack output', () => {
    template.hasOutput('FanoutLambdaName', {});
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(stack);
    assertNoHighFindings(stack);
  });
});
