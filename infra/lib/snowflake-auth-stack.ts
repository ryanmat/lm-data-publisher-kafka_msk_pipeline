// Description: SnowflakeAuthStack creates a Secrets Manager secret for Snowflake key-pair auth
// Description: The secret holds the service user name and RSA private key for Firehose delivery

import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class SnowflakeAuthStack extends cdk.Stack {
  public readonly secret: secretsmanager.ISecret;
  public readonly secretArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Placeholder JSON shape — operator fills in real values after deploy
    const placeholderValue = JSON.stringify({
      user: 'REPLACE_WITH_SNOWFLAKE_SERVICE_USER',
      privateKey: 'REPLACE_WITH_PEM_PRIVATE_KEY',
    });

    // Create Secrets Manager secret for Snowflake service user key pair
    const secret = new secretsmanager.Secret(this, 'SnowflakeKeypairSecret', {
      secretName: 'lm-datapublisher/snowflake-keypair',
      description: 'Snowflake service user key pair for Firehose delivery',
      secretStringValue: cdk.SecretValue.unsafePlainText(placeholderValue),
    });

    this.secret = secret;
    this.secretArn = secret.secretArn;

    // Export secret ARN for cross-stack references
    new cdk.CfnOutput(this, 'SnowflakeSecretArn', {
      value: secret.secretArn,
      description: 'Snowflake secret ARN for key-pair auth',
      exportName: `${this.stackName}-SnowflakeSecretArn`,
    });
  }
}
