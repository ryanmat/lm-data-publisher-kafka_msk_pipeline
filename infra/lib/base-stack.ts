// ABOUTME: Base stack providing common infrastructure configuration
// ABOUTME: Serves as foundation for other stacks to build upon

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Base stack - placeholder for common resources
    // Will be expanded as we add storage, networking, etc.
  }
}
