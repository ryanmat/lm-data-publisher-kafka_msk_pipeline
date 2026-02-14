// Description: Tests for SnowflakeSetupStack (CDK Custom Resource for Snowflake DDL)
// Description: Validates Lambda function, Custom Resource, IAM permissions, and CDK Nag compliance

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SnowflakeSetupStack } from './snowflake-setup-stack';
import { SnowflakeAuthStack } from './snowflake-auth-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('SnowflakeSetupStack', () => {
  let app: cdk.App;
  let authStack: SnowflakeAuthStack;
  let stack: SnowflakeSetupStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    authStack = new SnowflakeAuthStack(app, 'TestAuthStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    stack = new SnowflakeSetupStack(app, 'TestSnowflakeSetupStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      secretArn: authStack.secretArn,
      snowflakeAccountUrl: 'https://test-org-test-acct.snowflakecomputing.com',
      snowflakeDatabase: 'LM_METRICS',
      snowflakeSchema: 'PIPELINE',
      snowflakeTable: 'ROW_EVENTS',
      snowflakeWarehouse: 'LM_FIREHOSE_WH',
    });
    template = Template.fromStack(stack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates Lambda function for Snowflake DDL setup', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: Match.stringLikeRegexp('python3\\..*'),
      Timeout: Match.anyValue(),
      Handler: Match.anyValue(),
    });
  });

  test('Lambda function has appropriate timeout', () => {
    const resources = template.findResources('AWS::Lambda::Function');
    const fn = Object.values(resources)[0];
    // Custom Resource Lambdas need enough time for DDL execution
    expect(fn.Properties.Timeout).toBeGreaterThanOrEqual(120);
  });

  test('Lambda function has Secrets Manager read permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'secretsmanager:GetSecretValue',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('Creates Custom Resource triggering the Lambda', () => {
    template.hasResource('AWS::CloudFormation::CustomResource', {});
  });

  test('Custom Resource passes Snowflake config properties', () => {
    template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      AccountUrl: 'https://test-org-test-acct.snowflakecomputing.com',
      Database: 'LM_METRICS',
      Schema: 'PIPELINE',
      Table: 'ROW_EVENTS',
      Warehouse: 'LM_FIREHOSE_WH',
    });
  });

  test('Exports database name as stack output', () => {
    template.hasOutput('SnowflakeDatabase', {
      Value: 'LM_METRICS',
    });
  });

  test('Exports schema name as stack output', () => {
    template.hasOutput('SnowflakeSchema', {
      Value: 'PIPELINE',
    });
  });

  test('Exports table name as stack output', () => {
    template.hasOutput('SnowflakeTable', {
      Value: 'ROW_EVENTS',
    });
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(stack);
    assertNoHighFindings(stack);
  });
});
