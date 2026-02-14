// Description: SnowflakeSetupStack creates Snowflake database, schema, table, and warehouse via CDK Custom Resource
// Description: Uses a Lambda function with snowflake-connector-python to execute DDL against Snowflake

import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface SnowflakeSetupStackProps extends cdk.StackProps {
  readonly secretArn: string;
  readonly snowflakeAccountUrl: string;
  readonly snowflakeDatabase: string;
  readonly snowflakeSchema: string;
  readonly snowflakeTable: string;
  readonly snowflakeWarehouse: string;
}

export class SnowflakeSetupStack extends cdk.Stack {
  public readonly database: string;
  public readonly schema: string;
  public readonly table: string;

  constructor(scope: Construct, id: string, props: SnowflakeSetupStackProps) {
    super(scope, id, props);

    this.database = props.snowflakeDatabase;
    this.schema = props.snowflakeSchema;
    this.table = props.snowflakeTable;

    // Lambda function that runs Snowflake DDL via snowflake-connector-python
    const setupFn = new lambda.Function(this, 'SnowflakeSetupFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda', 'snowflake_setup')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      description: 'CloudFormation Custom Resource handler for Snowflake DDL setup',
    });

    // Grant Lambda read access to the Snowflake credentials secret
    setupFn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [props.secretArn],
    }));

    // Log group for the Custom Resource provider framework
    const providerLogGroup = new logs.LogGroup(this, 'SnowflakeSetupProviderLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Custom Resource that triggers the Lambda on stack create/update
    const provider = new cr.Provider(this, 'SnowflakeSetupProvider', {
      onEventHandler: setupFn,
      logGroup: providerLogGroup,
    });

    new cdk.CustomResource(this, 'SnowflakeSetupResource', {
      serviceToken: provider.serviceToken,
      properties: {
        AccountUrl: props.snowflakeAccountUrl,
        Database: props.snowflakeDatabase,
        Schema: props.snowflakeSchema,
        Table: props.snowflakeTable,
        Warehouse: props.snowflakeWarehouse,
        SecretArn: props.secretArn,
      },
    });

    // Export Snowflake resource names for cross-stack references
    new cdk.CfnOutput(this, 'SnowflakeDatabase', {
      value: props.snowflakeDatabase,
      description: 'Snowflake database name',
    });

    new cdk.CfnOutput(this, 'SnowflakeSchema', {
      value: props.snowflakeSchema,
      description: 'Snowflake schema name',
    });

    new cdk.CfnOutput(this, 'SnowflakeTable', {
      value: props.snowflakeTable,
      description: 'Snowflake table name',
    });
  }
}
