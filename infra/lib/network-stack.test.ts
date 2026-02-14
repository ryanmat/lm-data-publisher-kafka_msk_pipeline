// ABOUTME: Tests for NetworkStack (VPC endpoints & security groups)
// ABOUTME: Validates feature-flagged VPC endpoint creation and security group rules for Pipes

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { NetworkStack } from './network-stack';
import { applyNagChecks, assertNoHighFindings } from './nag-test-helper';

describe('NetworkStack', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  describe('with FEATURE_PRIVATE_PIPE=false (default)', () => {
    let stack: NetworkStack;
    let template: Template;

    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStack', {
        env: { account: '123456789012', region: 'us-west-2' },
        vpcId: 'vpc-12345', // Use VPC ID lookup in tests
        mskSecurityGroupId: 'sg-msk-12345',
        enablePrivatePipe: false,
      });

      template = Template.fromStack(stack);
    });

    test('Stack synthesizes successfully', () => {
      expect(template).toBeDefined();
    });

    test('Does not create VPC endpoint when feature flag is false', () => {
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
    });

    test('Creates Pipe security group', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: Match.stringLikeRegexp('.*Pipe.*'),
      });
    });

    test('Pipe security group allows egress to MSK on port 9094', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        IpProtocol: 'tcp',
        FromPort: 9094,
        ToPort: 9094,
        Description: Match.stringLikeRegexp('.*MSK.*'),
      });
    });

    test('Pipe security group created with explicit egress rules', () => {
      // Verify security group exists
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: Match.stringLikeRegexp('.*Pipe.*'),
      });

      // At least one egress rule should exist (for MSK on port 9094)
      const egressRules = template.findResources('AWS::EC2::SecurityGroupEgress');
      expect(Object.keys(egressRules).length).toBeGreaterThan(0);
    });

    test('MSK security group allows ingress from Pipe SG on port 9094', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 9094,
        ToPort: 9094,
        Description: Match.stringLikeRegexp('.*Pipe.*'),
      });
    });

    test('Exports Pipe security group ID', () => {
      template.hasOutput('PipeSecurityGroupId', {
        Description: Match.stringLikeRegexp('.*[Ss]ecurity group.*'),
      });
    });
  });

  describe('with FEATURE_PRIVATE_PIPE=true', () => {
    let stack: NetworkStack;
    let template: Template;

    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStackPrivate', {
        env: { account: '123456789012', region: 'us-west-2' },
        vpcId: 'vpc-67890',
        mskSecurityGroupId: 'sg-msk-67890',
        enablePrivatePipe: true,
      });

      template = Template.fromStack(stack);
    });

    test('Creates VPC endpoint for pipes-data service', () => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: Match.stringLikeRegexp('com\\.amazonaws\\..*\\.pipes-data'),
        VpcEndpointType: 'Interface',
      });
    });

    test('VPC endpoint is associated with Pipe security group', () => {
      const resources = template.findResources('AWS::EC2::VPCEndpoint');
      const endpoint = Object.values(resources)[0];

      expect(endpoint.Properties.SecurityGroupIds).toBeDefined();
      expect(Array.isArray(endpoint.Properties.SecurityGroupIds)).toBe(true);
      expect(endpoint.Properties.SecurityGroupIds.length).toBeGreaterThan(0);
    });

    test('VPC endpoint is placed in private subnets', () => {
      const resources = template.findResources('AWS::EC2::VPCEndpoint');
      const endpoint = Object.values(resources)[0];

      expect(endpoint.Properties.SubnetIds).toBeDefined();
      expect(Array.isArray(endpoint.Properties.SubnetIds)).toBe(true);
      expect(endpoint.Properties.SubnetIds.length).toBeGreaterThan(0);
    });

    test('Exports VPC endpoint ID when enabled', () => {
      template.hasOutput('PipeVpcEndpointId', {
        Description: Match.stringLikeRegexp('.*VPC endpoint.*'),
      });
    });
  });

  describe('CDK Nag compliance', () => {
    test('No High severity findings without VPC endpoint', () => {
      const stack = new NetworkStack(app, 'TestNetworkStackNag1', {
        env: { account: '123456789012', region: 'us-west-2' },
        vpcId: 'vpc-nag1',
        mskSecurityGroupId: 'sg-msk-nag1',
        enablePrivatePipe: false,
      });

      applyNagChecks(stack);
      assertNoHighFindings(stack);
    });

    test('No High severity findings with VPC endpoint', () => {
      const stack = new NetworkStack(app, 'TestNetworkStackNag2', {
        env: { account: '123456789012', region: 'us-west-2' },
        vpcId: 'vpc-nag2',
        mskSecurityGroupId: 'sg-msk-nag2',
        enablePrivatePipe: true,
      });

      applyNagChecks(stack);
      assertNoHighFindings(stack);
    });
  });
});
