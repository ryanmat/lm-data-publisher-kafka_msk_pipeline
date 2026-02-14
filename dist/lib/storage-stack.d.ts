import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export declare class StorageStack extends cdk.Stack {
    readonly bucket: s3.IBucket;
    readonly kmsKey: kms.IKey;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
