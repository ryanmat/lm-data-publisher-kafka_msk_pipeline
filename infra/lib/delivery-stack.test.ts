// ABOUTME: Tests for DeliveryStack (Firehose → S3)
// ABOUTME: Validates Firehose stream configuration, compression, buffering, and IAM grants

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { StorageStack } from './storage-stack';
import { DeliveryStack } from './delivery-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('DeliveryStack', () => {
  let app: cdk.App;
  let storageStack: StorageStack;
  let deliveryStack: DeliveryStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    storageStack = new StorageStack(app, 'TestStorageStack', {
      env: { account: '123456789012', region: 'us-west-2' },
    });
    deliveryStack = new DeliveryStack(app, 'TestDeliveryStack', {
      env: { account: '123456789012', region: 'us-west-2' },
      bucket: storageStack.bucket,
      kmsKey: storageStack.kmsKey,
    });
    template = Template.fromStack(deliveryStack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates Firehose delivery stream', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      DeliveryStreamType: 'DirectPut',
    });
  });

  test('Configures S3 destination with bucket from StorageStack', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      ExtendedS3DestinationConfiguration: Match.objectLike({
        BucketARN: Match.anyValue(),
      }),
    });
  });

  test('Enables gzip compression', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      ExtendedS3DestinationConfiguration: Match.objectLike({
        CompressionFormat: 'GZIP',
      }),
    });
  });

  test('Configures buffering hints within specified range', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      ExtendedS3DestinationConfiguration: Match.objectLike({
        BufferingHints: {
          IntervalInSeconds: Match.anyValue(),
          SizeInMBs: Match.anyValue(),
        },
      }),
    });

    // Extract actual values to verify they're in range
    const resources = template.findResources('AWS::KinesisFirehose::DeliveryStream');
    const deliveryStream = Object.values(resources)[0];
    const bufferingHints = deliveryStream.Properties.ExtendedS3DestinationConfiguration.BufferingHints;

    expect(bufferingHints.IntervalInSeconds).toBeGreaterThanOrEqual(60); // 1 min
    expect(bufferingHints.IntervalInSeconds).toBeLessThanOrEqual(300); // 5 min
    expect(bufferingHints.SizeInMBs).toBeGreaterThanOrEqual(5);
    expect(bufferingHints.SizeInMBs).toBeLessThanOrEqual(32);
  });

  test('Creates IAM role for Firehose', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'firehose.amazonaws.com',
            },
          }),
        ]),
      }),
    });
  });

  test('Grants Firehose write permissions to S3 bucket', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              's3:PutObject',
            ]),
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('Grants Firehose permissions to use KMS key', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'kms:Decrypt',
              'kms:GenerateDataKey',
            ]),
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('Configures error output prefix', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      ExtendedS3DestinationConfiguration: Match.objectLike({
        ErrorOutputPrefix: Match.stringLikeRegexp('.*error.*'),
      }),
    });
  });

  test('Exports delivery stream name as output', () => {
    template.hasOutput('DeliveryStreamName', {
      Description: Match.stringLikeRegexp('.*Firehose.*'),
    });
  });

  test('Exports delivery stream ARN as output', () => {
    template.hasOutput('DeliveryStreamArn', {
      Description: Match.stringLikeRegexp('.*Firehose.*'),
    });
  });

  test('Enables dynamic partitioning', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      ExtendedS3DestinationConfiguration: Match.objectLike({
        DynamicPartitioningConfiguration: {
          Enabled: true,
        },
      }),
    });
  });

  test('Configures processing configuration for dynamic partitioning', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      ExtendedS3DestinationConfiguration: Match.objectLike({
        ProcessingConfiguration: {
          Enabled: true,
          Processors: Match.arrayWith([
            Match.objectLike({
              Type: 'MetadataExtraction',
              Parameters: Match.arrayWith([
                Match.objectLike({
                  ParameterName: 'MetadataExtractionQuery',
                }),
                Match.objectLike({
                  ParameterName: 'JsonParsingEngine',
                  ParameterValue: 'JQ-1.6',
                }),
              ]),
            }),
          ]),
        },
      }),
    });
  });

  test('Configures JQ expressions for orgId, metric, and date partitioning', () => {
    const resources = template.findResources('AWS::KinesisFirehose::DeliveryStream');
    const deliveryStream = Object.values(resources)[0];
    const processors = deliveryStream.Properties.ExtendedS3DestinationConfiguration.ProcessingConfiguration.Processors;

    const metadataProcessor = processors.find((p: any) => p.Type === 'MetadataExtraction');
    expect(metadataProcessor).toBeDefined();

    const queryParam = metadataProcessor.Parameters.find((p: any) => p.ParameterName === 'MetadataExtractionQuery');
    expect(queryParam).toBeDefined();

    const jqQuery = queryParam.ParameterValue;

    // Verify the JQ query extracts orgId, metric, and date fields
    expect(jqQuery).toContain('orgId');
    expect(jqQuery).toContain('metric');
    expect(jqQuery).toContain('year');
    expect(jqQuery).toContain('month');
    expect(jqQuery).toContain('day');
    expect(jqQuery).toContain('hour');
  });

  test('Configures S3 prefix with dynamic partitioning keys', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      ExtendedS3DestinationConfiguration: Match.objectLike({
        Prefix: Match.stringLikeRegexp('.*orgId.*metric.*'),
      }),
    });
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(deliveryStack);
    assertNoHighFindings(deliveryStack);
  });
});
