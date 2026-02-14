// Description: StorageStack creates S3 bucket for Firehose error/backup data with KMS encryption
// Description: Snowflake is the primary destination; this bucket captures failed deliveries only

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
    this.kmsKey = new kms.Key(this, 'ErrorBackupKey', {
      description: 'KMS key for S3 error/backup bucket encryption',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create KMS alias for discoverability
    new kms.Alias(this, 'ErrorBackupKeyAlias', {
      aliasName: 'alias/lm-datapublisher-error-backup',
      targetKey: this.kmsKey,
    });

    // Create S3 bucket for Firehose error/backup records
    this.bucket = new s3.Bucket(this, 'ErrorBackupBucket', {
      // Encryption with customer-managed KMS key
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,

      // Block all public access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // No lifecycle rules — Snowflake is primary destination,
      // this bucket only captures failed Firehose deliveries
      versioned: false,
      autoDeleteObjects: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Export bucket name
    new cdk.CfnOutput(this, 'ErrorBackupBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for error/backup records',
      exportName: `${this.stackName}-BucketName`,
    });

    // Export KMS key ARN
    new cdk.CfnOutput(this, 'ErrorBackupKmsKeyArn', {
      value: this.kmsKey.keyArn,
      description: 'KMS key ARN for error/backup bucket encryption',
      exportName: `${this.stackName}-KmsKeyArn`,
    });
  }
}
