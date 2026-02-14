// Description: Tests for AlarmsStack (CloudWatch alarms for pipeline operational monitoring)
// Description: Validates alarms for Pipe failures, DLQ depth, Firehose delivery, and CDK Nag

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AlarmsStack } from './alarms-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('AlarmsStack', () => {
  let app: cdk.App;
  let stack: AlarmsStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AlarmsStack(app, 'TestAlarmsStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      dlqName: 'lm-datapublisher-pipe-dlq',
      firehoseStreamName: 'lm-datapublisher-delivery',
      pipeName: 'lm-datapublisher-msk-pipe',
    });
    template = Template.fromStack(stack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates alarm for DLQ message depth', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'ApproximateNumberOfMessagesVisible',
      Namespace: 'AWS/SQS',
      Threshold: 1,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
    });
  });

  test('Creates alarm for Firehose delivery failures', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'DeliveryToSnowflake.Success',
      Namespace: 'AWS/Firehose',
    });
  });

  test('Creates alarm for Firehose data freshness', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'DeliveryToSnowflake.DataFreshness',
      Namespace: 'AWS/Firehose',
    });
  });

  test('All alarms have descriptions', () => {
    const alarms = template.findResources('AWS::CloudWatch::Alarm');
    for (const alarm of Object.values(alarms)) {
      expect(alarm.Properties.AlarmDescription).toBeDefined();
    }
  });

  test('Creates at least 3 alarms', () => {
    const alarms = template.findResources('AWS::CloudWatch::Alarm');
    expect(Object.keys(alarms).length).toBeGreaterThanOrEqual(3);
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(stack);
    assertNoHighFindings(stack);
  });
});
