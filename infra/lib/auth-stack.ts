// Description: AuthStack creates a Secrets Manager secret for MSK mTLS client authentication
// Description: The secret holds the client certificate and RSA private key for EventBridge Pipes MSK source

import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  public readonly secret: secretsmanager.ISecret;
  public readonly secretArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Placeholder JSON shape matching CLIENT_CERTIFICATE_TLS_AUTH format
    // Operator fills in real PEM values after deploy
    const placeholderValue = JSON.stringify({
      certificate: 'REPLACE_WITH_PEM_CLIENT_CERTIFICATE',
      privateKey: 'REPLACE_WITH_PEM_PRIVATE_KEY',
    });

    // Create Secrets Manager secret for MSK mTLS client cert + key
    const secret = new secretsmanager.Secret(this, 'MskMtlsSecret', {
      secretName: 'lm-datapublisher/msk-mtls-keypair',
      description: 'MSK mTLS client certificate and private key for EventBridge Pipes',
      secretStringValue: cdk.SecretValue.unsafePlainText(placeholderValue),
    });

    this.secret = secret;
    this.secretArn = secret.secretArn;

    // Export secret ARN for cross-stack references (PipeStack)
    new cdk.CfnOutput(this, 'MskMtlsSecretArn', {
      value: secret.secretArn,
      description: 'mTLS secret ARN for MSK client authentication',
      exportName: `${this.stackName}-MskMtlsSecretArn`,
    });
  }
}
