// ABOUTME: StorageStack creates S3 bucket for data lake with KMS encryption and lifecycle policies
// ABOUTME: Provides secure, cost-optimized storage for OTLP metrics data

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export class StorageStack extends cdk.Stack {
  public readonly bucket: s3.IBucket;
  public readonly kmsKey: kms.IKey;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create KMS key for S3 bucket encryption
    this.kmsKey = new kms.Key(this, 'DataLakeKey', {
      description: 'KMS key for S3 data lake bucket encryption',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create KMS alias for discoverability
    new kms.Alias(this, 'DataLakeKeyAlias', {
      aliasName: 'alias/lm-datapublisher-datalake',
      targetKey: this.kmsKey,
    });

    // Create S3 bucket for data lake
    this.bucket = new s3.Bucket(this, 'DataLakeBucket', {
      // Encryption with customer-managed KMS key
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,

      // Block all public access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // Lifecycle rules for cost optimization
      lifecycleRules: [
        {
          id: 'transition-to-ia',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(180),
            },
          ],
        },
        {
          id: 'expire-old-data',
          enabled: true,
          expiration: cdk.Duration.days(365),
        },
      ],

      // Versioning for data protection
      versioned: false,

      // Auto-delete objects on stack deletion (for demo environments)
      autoDeleteObjects: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Export bucket name
    new cdk.CfnOutput(this, 'DataLakeBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for data lake',
      exportName: `${this.stackName}-BucketName`,
    });

    // Export KMS key ARN
    new cdk.CfnOutput(this, 'DataLakeKmsKeyArn', {
      value: this.kmsKey.keyArn,
      description: 'KMS key ARN for data lake encryption',
      exportName: `${this.stackName}-KmsKeyArn`,
    });
  }
}
