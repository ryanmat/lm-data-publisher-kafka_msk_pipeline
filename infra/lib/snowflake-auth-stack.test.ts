// Description: Tests for SnowflakeAuthStack (Secrets Manager for Snowflake key pair)
// Description: Validates secret creation, JSON structure template, and CDK Nag compliance

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SnowflakeAuthStack } from './snowflake-auth-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('SnowflakeAuthStack', () => {
  let app: cdk.App;
  let stack: SnowflakeAuthStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new SnowflakeAuthStack(app, 'TestSnowflakeAuthStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates Secrets Manager secret for Snowflake key pair', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Description: Match.stringLikeRegexp('.*Snowflake.*key.*pair.*'),
    });
  });

  test('Secret has a name for discoverability', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'lm-datapublisher/snowflake-keypair',
    });
  });

  test('Secret template contains user and privateKey fields', () => {
    const resources = template.findResources('AWS::SecretsManager::Secret');
    const secret = Object.values(resources)[0];
    const secretString = secret.Properties.GenerateSecretString?.SecretStringTemplate
      || secret.Properties.SecretString;

    // The secret should define the JSON shape with placeholder values
    expect(secretString).toBeDefined();
    const parsed = JSON.parse(secretString);
    expect(parsed).toHaveProperty('user');
    expect(parsed).toHaveProperty('privateKey');
  });

  test('Exports secret ARN as stack output', () => {
    template.hasOutput('SnowflakeSecretArn', {
      Description: Match.stringLikeRegexp('.*Snowflake.*secret.*ARN.*'),
    });
  });

  test('Exposes secretArn property for cross-stack references', () => {
    expect(stack.secretArn).toBeDefined();
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(stack);
    assertNoHighFindings(stack);
  });
});
