// Description: Tests for DeliveryStack (Firehose -> Snowflake)
// Description: Validates Firehose stream Snowflake destination, auth, buffering, S3 backup, and IAM

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { StorageStack } from './storage-stack';
import { DeliveryStack } from './delivery-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('DeliveryStack', () => {
  let app: cdk.App;
  let storageStack: StorageStack;
  let authStack: cdk.Stack;
  let secret: secretsmanager.Secret;
  let deliveryStack: DeliveryStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const env = { account: '123456789012', region: 'us-east-1' };

    storageStack = new StorageStack(app, 'TestStorageStack', { env });

    // Create a secret in a helper stack for cross-stack reference
    authStack = new cdk.Stack(app, 'TestAuthStack', { env });
    secret = new secretsmanager.Secret(authStack, 'TestSecret', {
      secretName: 'test/snowflake-keypair',
    });

    deliveryStack = new DeliveryStack(app, 'TestDeliveryStack', {
      env,
      errorBucket: storageStack.bucket,
      kmsKey: storageStack.kmsKey,
      snowflakeAccountUrl: 'https://test-org.snowflakecomputing.com',
      snowflakeDatabase: 'LM_METRICS',
      snowflakeSchema: 'PIPELINE',
      snowflakeTable: 'ROW_EVENTS',
      snowflakeUser: 'LM_FIREHOSE_SVC',
      snowflakeSecretArn: secret.secretArn,
    });
    template = Template.fromStack(deliveryStack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates Firehose delivery stream with DirectPut', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      DeliveryStreamType: 'DirectPut',
    });
  });

  test('Configures Snowflake destination (not ExtendedS3)', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        AccountUrl: Match.anyValue(),
      }),
    });

    // Ensure ExtendedS3 is NOT present
    const resources = template.findResources('AWS::KinesisFirehose::DeliveryStream');
    const stream = Object.values(resources)[0];
    expect(stream.Properties.ExtendedS3DestinationConfiguration).toBeUndefined();
  });

  test('Sets correct Snowflake account URL, database, schema, table', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        AccountUrl: 'https://test-org.snowflakecomputing.com',
        Database: 'LM_METRICS',
        Schema: 'PIPELINE',
        Table: 'ROW_EVENTS',
      }),
    });
  });

  test('Uses JSON_MAPPING data loading option', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        DataLoadingOption: 'JSON_MAPPING',
      }),
    });
  });

  test('Configures Secrets Manager for Snowflake auth', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        SecretsManagerConfiguration: Match.objectLike({
          Enabled: true,
          SecretARN: Match.anyValue(),
        }),
      }),
    });
  });

  test('Configures S3 backup for failed records', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        S3Configuration: Match.objectLike({
          BucketARN: Match.anyValue(),
          RoleARN: Match.anyValue(),
          CompressionFormat: 'GZIP',
        }),
      }),
    });
  });

  test('Sets S3 backup mode to FailedDataOnly', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        S3BackupMode: 'FailedDataOnly',
      }),
    });
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

  test('Grants Firehose read access to Secrets Manager secret', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'secretsmanager:GetSecretValue',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('Configures buffering hints', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        BufferingHints: Match.objectLike({
          IntervalInSeconds: Match.anyValue(),
          SizeInMBs: Match.anyValue(),
        }),
      }),
    });
  });

  test('Configures CloudWatch logging', () => {
    template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
      SnowflakeDestinationConfiguration: Match.objectLike({
        CloudWatchLoggingOptions: Match.objectLike({
          Enabled: true,
        }),
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

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(deliveryStack);
    assertNoHighFindings(deliveryStack);
  });
});
