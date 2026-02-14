// Description: AlarmsStack creates CloudWatch alarms for pipeline operational monitoring
// Description: Monitors DLQ depth, Firehose delivery success, and data freshness

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface AlarmsStackProps extends cdk.StackProps {
  readonly dlqName: string;
  readonly firehoseStreamName: string;
  readonly pipeName: string;
}

export class AlarmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AlarmsStackProps) {
    super(scope, id, props);

    // Alarm: DLQ has messages (failed pipe source invocations)
    new cloudwatch.Alarm(this, 'DlqDepthAlarm', {
      alarmName: 'lm-datapublisher-dlq-depth',
      alarmDescription: 'Dead-letter queue has messages indicating failed pipe source invocations',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfMessagesVisible',
        dimensionsMap: {
          QueueName: props.dlqName,
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Maximum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Alarm: Firehose delivery to Snowflake success drops below 1 (no successful deliveries)
    new cloudwatch.Alarm(this, 'FirehoseDeliverySuccessAlarm', {
      alarmName: 'lm-datapublisher-firehose-delivery-success',
      alarmDescription: 'Firehose delivery to Snowflake success rate has dropped to zero',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Firehose',
        metricName: 'DeliveryToSnowflake.Success',
        dimensionsMap: {
          DeliveryStreamName: props.firehoseStreamName,
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    // Alarm: Firehose data freshness exceeds 15 minutes
    new cloudwatch.Alarm(this, 'FirehoseDataFreshnessAlarm', {
      alarmName: 'lm-datapublisher-firehose-data-freshness',
      alarmDescription: 'Firehose data freshness exceeds 15 minutes indicating delivery lag',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Firehose',
        metricName: 'DeliveryToSnowflake.DataFreshness',
        dimensionsMap: {
          DeliveryStreamName: props.firehoseStreamName,
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Maximum',
      }),
      threshold: 900, // 15 minutes in seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }
}
