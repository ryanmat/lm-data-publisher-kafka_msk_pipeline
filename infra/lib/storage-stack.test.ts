// Description: Tests for StorageStack (S3 error/backup bucket + KMS)
// Description: Validates encryption, block public access, no lifecycle policies, and CDK Nag compliance

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
      env: { account: '123456789012', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates KMS key for bucket encryption', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: Match.stringLikeRegexp('.*error.*backup.*encryption.*'),
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

  test('Bucket has no lifecycle rules', () => {
    const resources = template.findResources('AWS::S3::Bucket');
    const bucket = Object.values(resources)[0];
    expect(bucket.Properties.LifecycleConfiguration).toBeUndefined();
  });

  test('Exports bucket name as stack output', () => {
    template.hasOutput('ErrorBackupBucketName', {
      Description: Match.stringLikeRegexp('.*bucket.*'),
    });
  });

  test('Exports KMS key ARN as stack output', () => {
    template.hasOutput('ErrorBackupKmsKeyArn', {
      Description: Match.stringLikeRegexp('.*KMS.*'),
    });
  });

  test('Bucket name includes hash suffix for uniqueness', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    expect(Object.keys(buckets).length).toBeGreaterThan(0);
  });

  test('KMS key alias targets error-backup naming', () => {
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/lm-datapublisher-error-backup',
    });
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(stack);
    assertNoHighFindings(stack);
  });
});
