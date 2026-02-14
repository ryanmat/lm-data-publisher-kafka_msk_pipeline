// Description: Tests for AuthStack (Secrets Manager for MSK mTLS client certificate)
// Description: Validates secret creation, JSON shape template, export, and CDK Nag compliance

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AuthStack } from './auth-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('AuthStack', () => {
  let app: cdk.App;
  let stack: AuthStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AuthStack(app, 'TestAuthStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('Stack synthesizes successfully', () => {
    expect(template).toBeDefined();
  });

  test('Creates Secrets Manager secret for mTLS certificate', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Description: Match.stringLikeRegexp('.*mTLS.*'),
    });
  });

  test('Secret has a discoverable name', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'lm-datapublisher/msk-mtls-keypair',
    });
  });

  test('Secret template contains certificate and privateKey fields', () => {
    const resources = template.findResources('AWS::SecretsManager::Secret');
    const secret = Object.values(resources)[0];
    const secretString = secret.Properties.GenerateSecretString?.SecretStringTemplate
      || secret.Properties.SecretString;

    expect(secretString).toBeDefined();
    const parsed = JSON.parse(secretString);
    expect(parsed).toHaveProperty('certificate');
    expect(parsed).toHaveProperty('privateKey');
  });

  test('Exports secret ARN as stack output', () => {
    template.hasOutput('MskMtlsSecretArn', {
      Description: Match.stringLikeRegexp('.*mTLS.*secret.*ARN.*'),
    });
  });

  test('Exposes secretArn property for cross-stack references', () => {
    expect(stack.secretArn).toBeDefined();
  });

  test('Exposes secret property for cross-stack references', () => {
    expect(stack.secret).toBeDefined();
  });

  test('No CDK Nag High severity findings', () => {
    applyNagChecks(stack);
    assertNoHighFindings(stack);
  });
});
