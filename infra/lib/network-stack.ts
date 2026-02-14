// ABOUTME: NetworkStack creates VPC endpoints and security groups for Pipes connectivity
// ABOUTME: Supports feature-flagged private endpoint and security rules for MSK access

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
  readonly vpc?: ec2.IVpc;
  readonly vpcId?: string;
  readonly mskSecurityGroupId: string;
  readonly enablePrivatePipe?: boolean;
}

export class NetworkStack extends cdk.Stack {
  public readonly pipeSecurityGroup: ec2.ISecurityGroup;
  public readonly vpcEndpoint?: ec2.IVpcEndpoint;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { vpc: vpcProp, vpcId, mskSecurityGroupId, enablePrivatePipe = false } = props;

    // Use provided VPC or import by ID
    const vpc = vpcProp || (vpcId ? ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId,
      vpcCidrBlock: '10.0.0.0/16',
      availabilityZones: ['us-west-2a', 'us-west-2b'],
      privateSubnetIds: ['subnet-private-1', 'subnet-private-2'],
      publicSubnetIds: ['subnet-public-1', 'subnet-public-2'],
      isolatedSubnetIds: ['subnet-isolated-1', 'subnet-isolated-2'],
    }) : (() => {
      throw new Error('Either vpc or vpcId must be provided');
    })());
    this.vpc = vpc;

    // Import the MSK security group
    const mskSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'MskSecurityGroup',
      mskSecurityGroupId
    );

    // Create security group for EventBridge Pipe
    this.pipeSecurityGroup = new ec2.SecurityGroup(this, 'PipeSecurityGroup', {
      vpc,
      description: 'Security group for EventBridge Pipe to access MSK and AWS services',
      allowAllOutbound: false,
    });

    // Allow Pipe to connect to MSK on port 9094 (TLS)
    this.pipeSecurityGroup.addEgressRule(
      mskSecurityGroup,
      ec2.Port.tcp(9094),
      'Allow Pipe to connect to MSK via TLS (port 9094)'
    );

    // Allow Pipe to connect to AWS services via HTTPS
    this.pipeSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow Pipe to connect to AWS services via HTTPS'
    );

    // Allow MSK to accept connections from Pipe on port 9094
    mskSecurityGroup.addIngressRule(
      this.pipeSecurityGroup,
      ec2.Port.tcp(9094),
      'Allow Pipe to connect to MSK brokers on port 9094'
    );

    // Conditionally create VPC endpoint for Pipes (feature-flagged)
    if (enablePrivatePipe) {
      this.vpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'PipeVpcEndpoint', {
        vpc,
        service: new ec2.InterfaceVpcEndpointService(
          `com.amazonaws.${this.region}.pipes-data`,
          443
        ),
        securityGroups: [this.pipeSecurityGroup],
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        privateDnsEnabled: true,
      });

      // Export VPC endpoint ID
      new cdk.CfnOutput(this, 'PipeVpcEndpointId', {
        value: this.vpcEndpoint.vpcEndpointId,
        description: 'VPC endpoint ID for EventBridge Pipes',
        exportName: `${this.stackName}-PipeVpcEndpointId`,
      });
    }

    // Export Pipe security group ID
    new cdk.CfnOutput(this, 'PipeSecurityGroupId', {
      value: this.pipeSecurityGroup.securityGroupId,
      description: 'Security group ID for EventBridge Pipe',
      exportName: `${this.stackName}-PipeSecurityGroupId`,
    });
  }
}
