// Description: PipeStack creates the EventBridge Pipe connecting MSK to Lambda fan-out
// Description: Includes Lambda deployment, CfnPipe (MSK mTLS source -> Lambda target), SQS DLQ, and CloudWatch logs

import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import { Construct } from 'constructs';

export interface PipeStackProps extends cdk.StackProps {
  readonly mskClusterArn: string;
  readonly mskTopic: string;
  readonly mtlsSecretArn: string;
  readonly firehoseStreamName: string;
  readonly firehoseStreamArn: string;
}

export class PipeStack extends cdk.Stack {
  public readonly fanoutLambda: lambda.IFunction;
  public readonly pipe: pipes.CfnPipe;

  constructor(scope: Construct, id: string, props: PipeStackProps) {
    super(scope, id, props);

    // SQS dead-letter queue for failed pipe source invocations
    const dlq = new sqs.Queue(this, 'PipeDLQ', {
      queueName: 'lm-datapublisher-pipe-dlq',
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // CloudWatch log group for pipe execution logs
    const pipeLogGroup = new logs.LogGroup(this, 'PipeLogGroup', {
      logGroupName: '/aws/pipes/lm-datapublisher-msk-pipe',
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function: deploys lambda/handler.py for OTLP 1->N fan-out
    this.fanoutLambda = new lambda.Function(this, 'FanoutFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      description: 'OTLP bundle fan-out: splits Kafka messages into row events for Firehose',
      environment: {
        FIREHOSE_STREAM_NAME: props.firehoseStreamName,
        BATCH_SIZE: '500',
      },
    });

    // Grant Lambda permission to write to Firehose
    this.fanoutLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'firehose:PutRecordBatch',
        'firehose:PutRecord',
      ],
      resources: [props.firehoseStreamArn],
    }));

    // IAM role for EventBridge Pipe
    const pipeRole = new iam.Role(this, 'PipeRole', {
      assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
      description: 'IAM role for EventBridge Pipe (MSK source -> Lambda target)',
    });

    // Pipe role: read from MSK cluster
    pipeRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kafka:DescribeCluster',
        'kafka:DescribeClusterV2',
        'kafka:GetBootstrapBrokers',
        'kafka-cluster:Connect',
        'kafka-cluster:DescribeGroup',
        'kafka-cluster:AlterGroup',
        'kafka-cluster:DescribeTopic',
        'kafka-cluster:ReadData',
        'kafka-cluster:DescribeClusterDynamicConfiguration',
      ],
      resources: ['*'],
    }));

    // Pipe role: read mTLS secret
    pipeRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [props.mtlsSecretArn],
    }));

    // Pipe role: invoke Lambda target
    pipeRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [this.fanoutLambda.functionArn],
    }));

    // Pipe role: send failed messages to DLQ
    dlq.grantSendMessages(pipeRole);

    // Pipe role: write to log group
    pipeLogGroup.grantWrite(pipeRole);

    // EventBridge Pipe: MSK (mTLS) -> Lambda fan-out
    this.pipe = new pipes.CfnPipe(this, 'MskToLambdaPipe', {
      name: 'lm-datapublisher-msk-pipe',
      roleArn: pipeRole.roleArn,
      source: props.mskClusterArn,
      sourceParameters: {
        managedStreamingKafkaParameters: {
          topicName: props.mskTopic,
          startingPosition: 'TRIM_HORIZON',
          batchSize: 10,
          maximumBatchingWindowInSeconds: 5,
          credentials: {
            clientCertificateTlsAuth: props.mtlsSecretArn,
          },
        },
      },
      target: this.fanoutLambda.functionArn,
      targetParameters: {
        lambdaFunctionParameters: {
          invocationType: 'REQUEST_RESPONSE',
        },
      },
      logConfiguration: {
        cloudwatchLogsLogDestination: {
          logGroupArn: pipeLogGroup.logGroupArn,
        },
        level: 'ERROR',
      },
    });

    // Dependency: Pipe depends on IAM role
    this.pipe.node.addDependency(pipeRole);

    // Exports
    new cdk.CfnOutput(this, 'PipeArn', {
      value: this.pipe.attrArn,
      description: 'EventBridge Pipe ARN',
      exportName: `${this.stackName}-PipeArn`,
    });

    new cdk.CfnOutput(this, 'FanoutLambdaName', {
      value: this.fanoutLambda.functionName,
      description: 'Fan-out Lambda function name',
      exportName: `${this.stackName}-FanoutLambdaName`,
    });

    new cdk.CfnOutput(this, 'DlqUrl', {
      value: dlq.queueUrl,
      description: 'Dead-letter queue URL for failed pipe messages',
      exportName: `${this.stackName}-DlqUrl`,
    });
  }
}
