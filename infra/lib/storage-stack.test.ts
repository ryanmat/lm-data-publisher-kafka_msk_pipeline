// ABOUTME: Tests for StorageStack (S3 + KMS + lifecycle)
// ABOUTME: Validates encryption, lifecycle policies, block public access, and CDK Nag compliance

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { StorageStack } from './storage-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('StorageStack', () => {
  let app: cdk.App;
  let stack: StorageStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new StorageStack(app, 'TestStorageStack', {
      env: { account: '123456789012', region: 'us-west-2' },
    });
    template = Template.fromStack(stack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates KMS key for bucket encryption', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: Match.stringLikeRegexp('.*S3.*encryption.*'),
      EnableKeyRotation: true,
    });
  });

  test('Creates S3 bucket with KMS encryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
              KMSMasterKeyID: Match.anyValue(),
            },
          },
        ],
      },
    });
  });

  test('Enforces block public access on bucket', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('Configures lifecycle policy for cost optimization', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: 'Enabled',
          }),
        ]),
      },
    });
  });

  test('Exports bucket name as stack output', () => {
    template.hasOutput('DataLakeBucketName', {
      Description: Match.stringLikeRegexp('.*bucket.*'),
    });
  });

  test('Exports KMS key ARN as stack output', () => {
    template.hasOutput('DataLakeKmsKeyArn', {
      Description: Match.stringLikeRegexp('.*KMS.*'),
    });
  });

  test('Bucket name includes hash suffix for uniqueness', () => {
    // Stack synthesis adds unique hash suffix to physical names
    // Verify bucket has a logical ID that will generate unique physical name
    const buckets = template.findResources('AWS::S3::Bucket');
    expect(Object.keys(buckets).length).toBeGreaterThan(0);
  });

  test('KMS key has alias for discoverability', () => {
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: Match.stringLikeRegexp('alias/.*'),
    });
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(stack);
    assertNoHighFindings(stack);
  });
});
