import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import { Construct } from 'constructs';
export interface DeliveryStackProps extends cdk.StackProps {
    readonly bucket: s3.IBucket;
    readonly kmsKey: kms.IKey;
}
export declare class DeliveryStack extends cdk.Stack {
    readonly deliveryStream: firehose.CfnDeliveryStream;
    constructor(scope: Construct, id: string, props: DeliveryStackProps);
}
