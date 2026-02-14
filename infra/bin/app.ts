#!/usr/bin/env node
// Description: CDK application entry point for LMDP MSK Pipeline
// Description: Instantiates and wires all infrastructure stacks with cross-stack dependencies

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseStack } from '../lib/base-stack';
import { StorageStack } from '../lib/storage-stack';
import { DeliveryStack } from '../lib/delivery-stack';
import { NetworkStack } from '../lib/network-stack';

const app = new cdk.App();

const stackEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const stackTags = {
  Project: 'lm-datapublisher',
  Environment: 'demo',
  ManagedBy: 'cdk',
};

new BaseStack(app, 'LMDataPublisherBaseStack', {
  env: stackEnv,
  tags: stackTags,
});

const storageStack = new StorageStack(app, 'LMDataPublisherStorageStack', {
  env: stackEnv,
  tags: stackTags,
});

// NetworkStack requires VPC and MSK security group IDs from context or env
const vpcId = app.node.tryGetContext('vpcId') || process.env.MSK_VPC_ID;
const mskSecurityGroupId = app.node.tryGetContext('mskSecurityGroupId') || process.env.MSK_SECURITY_GROUP_ID;

if (vpcId && mskSecurityGroupId) {
  new NetworkStack(app, 'LMDataPublisherNetworkStack', {
    env: stackEnv,
    tags: stackTags,
    vpcId,
    mskSecurityGroupId,
  });
}

// DeliveryStack wired in Phase 4 (W1) after Snowflake stacks exist
new DeliveryStack(app, 'LMDataPublisherDeliveryStack', {
  env: stackEnv,
  tags: stackTags,
  bucket: storageStack.bucket,
  kmsKey: storageStack.kmsKey,
});

app.synth();
