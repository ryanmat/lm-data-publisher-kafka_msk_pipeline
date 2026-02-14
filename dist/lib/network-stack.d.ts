import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface NetworkStackProps extends cdk.StackProps {
    readonly vpc?: ec2.IVpc;
    readonly vpcId?: string;
    readonly mskSecurityGroupId: string;
    readonly enablePrivatePipe?: boolean;
}
export declare class NetworkStack extends cdk.Stack {
    readonly pipeSecurityGroup: ec2.ISecurityGroup;
    readonly vpcEndpoint?: ec2.IVpcEndpoint;
    readonly vpc: ec2.IVpc;
    constructor(scope: Construct, id: string, props: NetworkStackProps);
}
