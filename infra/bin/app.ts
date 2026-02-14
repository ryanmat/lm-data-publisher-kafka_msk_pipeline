#!/usr/bin/env node
// Description: CDK application entry point for LMDP MSK Pipeline
// Description: Instantiates and wires all infrastructure stacks with cross-stack dependencies

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseStack } from '../lib/base-stack';
import { StorageStack } from '../lib/storage-stack';
import { DeliveryStack } from '../lib/delivery-stack';
import { NetworkStack } from '../lib/network-stack';
import { SnowflakeAuthStack } from '../lib/snowflake-auth-stack';
import { SnowflakeSetupStack } from '../lib/snowflake-setup-stack';
import { AuthStack } from '../lib/auth-stack';
import { PipeStack } from '../lib/pipe-stack';
import { AlarmsStack } from '../lib/alarms-stack';

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

// --- Snowflake configuration from CDK context or environment variables ---
const snowflakeAccountUrl = app.node.tryGetContext('snowflakeAccountUrl')
  || process.env.SNOWFLAKE_ACCOUNT_URL
  || 'https://REPLACE_ME.snowflakecomputing.com';
const snowflakeDatabase = app.node.tryGetContext('snowflakeDatabase')
  || process.env.SNOWFLAKE_DATABASE
  || 'LM_METRICS';
const snowflakeSchema = app.node.tryGetContext('snowflakeSchema')
  || process.env.SNOWFLAKE_SCHEMA
  || 'PIPELINE';
const snowflakeTable = app.node.tryGetContext('snowflakeTable')
  || process.env.SNOWFLAKE_TABLE
  || 'ROW_EVENTS';
const snowflakeWarehouse = app.node.tryGetContext('snowflakeWarehouse')
  || process.env.SNOWFLAKE_WAREHOUSE
  || 'LM_FIREHOSE_WH';
const snowflakeUser = app.node.tryGetContext('snowflakeUser')
  || process.env.SNOWFLAKE_USER
  || 'LM_FIREHOSE_SVC';

// --- MSK configuration from CDK context or environment variables ---
const mskClusterArn = app.node.tryGetContext('mskClusterArn')
  || process.env.MSK_CLUSTER_ARN
  || '';
const mskTopic = app.node.tryGetContext('mskTopic')
  || process.env.MSK_TOPIC
  || 'lm.metrics.otlp';
const vpcId = app.node.tryGetContext('vpcId') || process.env.MSK_VPC_ID;
const mskSecurityGroupId = app.node.tryGetContext('mskSecurityGroupId') || process.env.MSK_SECURITY_GROUP_ID;

// ========================================================================
// Stack instantiation with cross-stack dependency wiring
// ========================================================================

// Base stack (tagging, shared config)
new BaseStack(app, 'LMDataPublisherBaseStack', {
  env: stackEnv,
  tags: stackTags,
});

// S3 error/backup bucket for Firehose failed deliveries
const storageStack = new StorageStack(app, 'LMDataPublisherStorageStack', {
  env: stackEnv,
  tags: stackTags,
});

// Snowflake auth: Secrets Manager secret for key-pair credentials
const snowflakeAuthStack = new SnowflakeAuthStack(app, 'LMDataPublisherSnowflakeAuthStack', {
  env: stackEnv,
  tags: stackTags,
});

// Snowflake setup: Custom Resource Lambda to create database/schema/table
const snowflakeSetupStack = new SnowflakeSetupStack(app, 'LMDataPublisherSnowflakeSetupStack', {
  env: stackEnv,
  tags: stackTags,
  secretArn: snowflakeAuthStack.secretArn,
  snowflakeAccountUrl,
  snowflakeDatabase,
  snowflakeSchema,
  snowflakeTable,
  snowflakeWarehouse,
});
snowflakeSetupStack.addDependency(snowflakeAuthStack);

// Firehose delivery stream targeting Snowflake
const deliveryStack = new DeliveryStack(app, 'LMDataPublisherDeliveryStack', {
  env: stackEnv,
  tags: stackTags,
  errorBucket: storageStack.bucket,
  kmsKey: storageStack.kmsKey,
  snowflakeAccountUrl,
  snowflakeDatabase,
  snowflakeSchema,
  snowflakeTable,
  snowflakeUser,
  snowflakeSecretArn: snowflakeAuthStack.secretArn,
});
deliveryStack.addDependency(storageStack);
deliveryStack.addDependency(snowflakeAuthStack);

// MSK mTLS auth: Secrets Manager secret for client certificate
const authStack = new AuthStack(app, 'LMDataPublisherAuthStack', {
  env: stackEnv,
  tags: stackTags,
});

// NetworkStack requires VPC and MSK security group IDs
if (vpcId && mskSecurityGroupId) {
  new NetworkStack(app, 'LMDataPublisherNetworkStack', {
    env: stackEnv,
    tags: stackTags,
    vpcId,
    mskSecurityGroupId,
  });
}

// EventBridge Pipe: MSK (mTLS) -> Lambda fan-out -> Firehose -> Snowflake
if (mskClusterArn) {
  const pipeStack = new PipeStack(app, 'LMDataPublisherPipeStack', {
    env: stackEnv,
    tags: stackTags,
    mskClusterArn,
    mskTopic,
    mtlsSecretArn: authStack.secretArn,
    firehoseStreamName: deliveryStack.deliveryStream.deliveryStreamName || 'lm-datapublisher-delivery',
    firehoseStreamArn: deliveryStack.deliveryStream.attrArn,
  });
  pipeStack.addDependency(authStack);
  pipeStack.addDependency(deliveryStack);

  // Operational alarms
  new AlarmsStack(app, 'LMDataPublisherAlarmsStack', {
    env: stackEnv,
    tags: stackTags,
    dlqName: 'lm-datapublisher-pipe-dlq',
    firehoseStreamName: deliveryStack.deliveryStream.deliveryStreamName || 'lm-datapublisher-delivery',
    pipeName: 'lm-datapublisher-msk-pipe',
  });
}

app.synth();
