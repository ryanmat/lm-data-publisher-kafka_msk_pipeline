// ABOUTME: DeliveryStack creates Firehose delivery stream for S3 data lake ingestion
// ABOUTME: Configures compression, buffering, and IAM permissions for Lambda writer target

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface DeliveryStackProps extends cdk.StackProps {
  readonly bucket: s3.IBucket;
  readonly kmsKey: kms.IKey;
}

export class DeliveryStack extends cdk.Stack {
  public readonly deliveryStream: firehose.CfnDeliveryStream;

  constructor(scope: Construct, id: string, props: DeliveryStackProps) {
    super(scope, id, props);

    const { bucket, kmsKey } = props;

    // Create IAM role for Firehose
    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      description: 'IAM role for Firehose delivery stream to write to S3',
    });

    // Grant Firehose write permissions to S3 bucket
    bucket.grantWrite(firehoseRole);

    // Grant Firehose permissions to use KMS key
    kmsKey.grant(
      firehoseRole,
      'kms:Decrypt',
      'kms:GenerateDataKey',
      'kms:DescribeKey'
    );

    // JQ query for dynamic partitioning metadata extraction
    // Extracts: orgId, metric, and date components (year, month, day, hour) from tsUnixMs
    const jqQuery = `{
      orgId: .orgId,
      metric: .metric,
      year: (.tsUnixMs / 1000 | strftime("%Y")),
      month: (.tsUnixMs / 1000 | strftime("%m")),
      day: (.tsUnixMs / 1000 | strftime("%d")),
      hour: (.tsUnixMs / 1000 | strftime("%H"))
    }`;

    // Create Firehose delivery stream
    this.deliveryStream = new firehose.CfnDeliveryStream(this, 'DeliveryStream', {
      deliveryStreamType: 'DirectPut',
      deliveryStreamName: 'lm-datapublisher-delivery',
      extendedS3DestinationConfiguration: {
        bucketArn: bucket.bucketArn,
        roleArn: firehoseRole.roleArn,

        // Compression
        compressionFormat: 'GZIP',

        // Buffering hints (3 min, 5 MB as reasonable defaults within range)
        bufferingHints: {
          intervalInSeconds: 180, // 3 minutes (within 1-5 min range)
          sizeInMBs: 5, // 5 MB (within 5-32 MB range)
        },

        // Dynamic partitioning enabled
        dynamicPartitioningConfiguration: {
          enabled: true,
        },

        // Processing configuration for metadata extraction
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              type: 'MetadataExtraction',
              parameters: [
                {
                  parameterName: 'MetadataExtractionQuery',
                  parameterValue: jqQuery,
                },
                {
                  parameterName: 'JsonParsingEngine',
                  parameterValue: 'JQ-1.6',
                },
              ],
            },
          ],
        },

        // S3 prefix with dynamic partitioning keys
        // Format: data/orgId=<orgId>/metric=<metric>/<year>/<month>/<day>/<hour>/
        prefix: 'data/orgId=!{partitionKeyFromQuery:orgId}/metric=!{partitionKeyFromQuery:metric}/!{partitionKeyFromQuery:year}/!{partitionKeyFromQuery:month}/!{partitionKeyFromQuery:day}/!{partitionKeyFromQuery:hour}/',

        // Error output prefix
        errorOutputPrefix: 'errors/!{firehose:error-output-type}/!{timestamp:yyyy/MM/dd}/',

        // CloudWatch logging
        cloudWatchLoggingOptions: {
          enabled: true,
          logGroupName: `/aws/kinesisfirehose/lm-datapublisher-delivery`,
          logStreamName: 'S3Delivery',
        },
      },
    });

    // Create log group for Firehose
    const logGroup = new cdk.aws_logs.LogGroup(this, 'FirehoseLogGroup', {
      logGroupName: '/aws/kinesisfirehose/lm-datapublisher-delivery',
      retention: cdk.aws_logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Firehose permissions to write logs
    logGroup.grantWrite(firehoseRole);

    // Dependency: Firehose stream depends on role being created
    this.deliveryStream.node.addDependency(firehoseRole);

    // Export delivery stream name
    new cdk.CfnOutput(this, 'DeliveryStreamName', {
      value: this.deliveryStream.deliveryStreamName || 'lm-datapublisher-delivery',
      description: 'Firehose delivery stream name',
      exportName: `${this.stackName}-DeliveryStreamName`,
    });

    // Export delivery stream ARN
    new cdk.CfnOutput(this, 'DeliveryStreamArn', {
      value: this.deliveryStream.attrArn,
      description: 'Firehose delivery stream ARN',
      exportName: `${this.stackName}-DeliveryStreamArn`,
    });
  }
}
