#!/usr/bin/env node
// ABOUTME: CDK application entry point
// ABOUTME: Initializes and synthesizes all infrastructure stacks

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseStack } from '../lib/base-stack';
import { StorageStack } from '../lib/storage-stack';
import { DeliveryStack } from '../lib/delivery-stack';

const app = new cdk.App();

const stackEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
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

new DeliveryStack(app, 'LMDataPublisherDeliveryStack', {
  env: stackEnv,
  tags: stackTags,
  bucket: storageStack.bucket,
  kmsKey: storageStack.kmsKey,
});

app.synth();
