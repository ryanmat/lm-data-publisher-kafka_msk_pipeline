// Description: DeliveryStack creates Firehose delivery stream targeting Snowflake
// Description: Configures Snowflake auth via Secrets Manager, S3 backup for failed records, and CloudWatch logging

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface DeliveryStackProps extends cdk.StackProps {
  readonly errorBucket: s3.IBucket;
  readonly kmsKey: kms.IKey;
  readonly snowflakeAccountUrl: string;
  readonly snowflakeDatabase: string;
  readonly snowflakeSchema: string;
  readonly snowflakeTable: string;
  readonly snowflakeUser: string;
  readonly snowflakeSecretArn: string;
}

export class DeliveryStack extends cdk.Stack {
  public readonly deliveryStream: firehose.CfnDeliveryStream;

  constructor(scope: Construct, id: string, props: DeliveryStackProps) {
    super(scope, id, props);

    const { errorBucket, kmsKey } = props;

    // IAM role for Firehose to write to S3 (backup) and read Snowflake credentials
    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      description: 'IAM role for Firehose delivery stream to deliver to Snowflake',
    });

    // Grant Firehose write permissions to the error/backup S3 bucket
    errorBucket.grantWrite(firehoseRole);

    // Grant Firehose permissions to use KMS key for S3 encryption
    kmsKey.grant(
      firehoseRole,
      'kms:Decrypt',
      'kms:GenerateDataKey',
      'kms:DescribeKey'
    );

    // Grant Firehose read access to the Snowflake credentials secret
    firehoseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [props.snowflakeSecretArn],
    }));

    // CloudWatch log group for Firehose delivery logging
    const logGroup = new logs.LogGroup(this, 'FirehoseLogGroup', {
      logGroupName: '/aws/kinesisfirehose/lm-datapublisher-delivery',
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Firehose permissions to write logs
    logGroup.grantWrite(firehoseRole);

    // Create Firehose delivery stream with Snowflake destination
    this.deliveryStream = new firehose.CfnDeliveryStream(this, 'DeliveryStream', {
      deliveryStreamType: 'DirectPut',
      deliveryStreamName: 'lm-datapublisher-delivery',
      snowflakeDestinationConfiguration: {
        accountUrl: props.snowflakeAccountUrl,
        database: props.snowflakeDatabase,
        schema: props.snowflakeSchema,
        table: props.snowflakeTable,
        user: props.snowflakeUser,
        dataLoadingOption: 'JSON_MAPPING',
        roleArn: firehoseRole.roleArn,

        // Snowflake auth via Secrets Manager (key-pair)
        secretsManagerConfiguration: {
          enabled: true,
          secretArn: props.snowflakeSecretArn,
          roleArn: firehoseRole.roleArn,
        },

        // S3 backup for failed records
        s3Configuration: {
          bucketArn: errorBucket.bucketArn,
          roleArn: firehoseRole.roleArn,
          prefix: 'snowflake-errors/',
          errorOutputPrefix: 'snowflake-errors/failed/',
          compressionFormat: 'GZIP',
        },
        s3BackupMode: 'FailedDataOnly',

        // Buffering: deliver every 60 seconds or 128 MB (whichever first)
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 128,
        },

        // Retry failed deliveries for 60 seconds before sending to S3 backup
        retryOptions: {
          durationInSeconds: 60,
        },

        // CloudWatch logging for delivery monitoring
        cloudWatchLoggingOptions: {
          enabled: true,
          logGroupName: logGroup.logGroupName,
          logStreamName: 'SnowflakeDelivery',
        },
      },
    });

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
