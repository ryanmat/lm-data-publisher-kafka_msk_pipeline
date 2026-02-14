"use strict";
// ABOUTME: StorageStack creates S3 bucket for data lake with KMS encryption and lifecycle policies
// ABOUTME: Provides secure, cost-optimized storage for OTLP metrics data
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
class StorageStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create KMS key for S3 bucket encryption
        this.kmsKey = new kms.Key(this, 'DataLakeKey', {
            description: 'KMS key for S3 data lake bucket encryption',
            enableKeyRotation: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        // Create KMS alias for discoverability
        new kms.Alias(this, 'DataLakeKeyAlias', {
            aliasName: 'alias/lm-datapublisher-datalake',
            targetKey: this.kmsKey,
        });
        // Create S3 bucket for data lake
        this.bucket = new s3.Bucket(this, 'DataLakeBucket', {
            // Encryption with customer-managed KMS key
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: this.kmsKey,
            // Block all public access
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            // Lifecycle rules for cost optimization
            lifecycleRules: [
                {
                    id: 'transition-to-ia',
                    enabled: true,
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(90),
                        },
                        {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: cdk.Duration.days(180),
                        },
                    ],
                },
                {
                    id: 'expire-old-data',
                    enabled: true,
                    expiration: cdk.Duration.days(365),
                },
            ],
            // Versioning for data protection
            versioned: false,
            // Auto-delete objects on stack deletion (for demo environments)
            autoDeleteObjects: false,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        // Export bucket name
        new cdk.CfnOutput(this, 'DataLakeBucketName', {
            value: this.bucket.bucketName,
            description: 'S3 bucket name for data lake',
            exportName: `${this.stackName}-BucketName`,
        });
        // Export KMS key ARN
        new cdk.CfnOutput(this, 'DataLakeKmsKeyArn', {
            value: this.kmsKey.keyArn,
            description: 'KMS key ARN for data lake encryption',
            exportName: `${this.stackName}-KmsKeyArn`,
        });
    }
}
exports.StorageStack = StorageStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2luZnJhL2xpYi9zdG9yYWdlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtR0FBbUc7QUFDbkcseUVBQXlFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFekUsaURBQW1DO0FBQ25DLHVEQUF5QztBQUN6Qyx5REFBMkM7QUFHM0MsTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QiwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUM3QyxXQUFXLEVBQUUsNENBQTRDO1lBQ3pELGlCQUFpQixFQUFFLElBQUk7WUFDdkIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtTQUN4QyxDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUN0QyxTQUFTLEVBQUUsaUNBQWlDO1lBQzVDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTTtTQUN2QixDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ2xELDJDQUEyQztZQUMzQyxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUc7WUFDbkMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBRTFCLDBCQUEwQjtZQUMxQixpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUVqRCx3Q0FBd0M7WUFDeEMsY0FBYyxFQUFFO2dCQUNkO29CQUNFLEVBQUUsRUFBRSxrQkFBa0I7b0JBQ3RCLE9BQU8sRUFBRSxJQUFJO29CQUNiLFdBQVcsRUFBRTt3QkFDWDs0QkFDRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUI7NEJBQy9DLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7eUJBQ3ZDO3dCQUNEOzRCQUNFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU87NEJBQ3JDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7eUJBQ3hDO3FCQUNGO2lCQUNGO2dCQUNEO29CQUNFLEVBQUUsRUFBRSxpQkFBaUI7b0JBQ3JCLE9BQU8sRUFBRSxJQUFJO29CQUNiLFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7aUJBQ25DO2FBQ0Y7WUFFRCxpQ0FBaUM7WUFDakMsU0FBUyxFQUFFLEtBQUs7WUFFaEIsZ0VBQWdFO1lBQ2hFLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtTQUN4QyxDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVO1lBQzdCLFdBQVcsRUFBRSw4QkFBOEI7WUFDM0MsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsYUFBYTtTQUMzQyxDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNO1lBQ3pCLFdBQVcsRUFBRSxzQ0FBc0M7WUFDbkQsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsWUFBWTtTQUMxQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUExRUQsb0NBMEVDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQUJPVVRNRTogU3RvcmFnZVN0YWNrIGNyZWF0ZXMgUzMgYnVja2V0IGZvciBkYXRhIGxha2Ugd2l0aCBLTVMgZW5jcnlwdGlvbiBhbmQgbGlmZWN5Y2xlIHBvbGljaWVzXG4vLyBBQk9VVE1FOiBQcm92aWRlcyBzZWN1cmUsIGNvc3Qtb3B0aW1pemVkIHN0b3JhZ2UgZm9yIE9UTFAgbWV0cmljcyBkYXRhXG5cbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBTdG9yYWdlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYnVja2V0OiBzMy5JQnVja2V0O1xuICBwdWJsaWMgcmVhZG9ubHkga21zS2V5OiBrbXMuSUtleTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgS01TIGtleSBmb3IgUzMgYnVja2V0IGVuY3J5cHRpb25cbiAgICB0aGlzLmttc0tleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdEYXRhTGFrZUtleScsIHtcbiAgICAgIGRlc2NyaXB0aW9uOiAnS01TIGtleSBmb3IgUzMgZGF0YSBsYWtlIGJ1Y2tldCBlbmNyeXB0aW9uJyxcbiAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIEtNUyBhbGlhcyBmb3IgZGlzY292ZXJhYmlsaXR5XG4gICAgbmV3IGttcy5BbGlhcyh0aGlzLCAnRGF0YUxha2VLZXlBbGlhcycsIHtcbiAgICAgIGFsaWFzTmFtZTogJ2FsaWFzL2xtLWRhdGFwdWJsaXNoZXItZGF0YWxha2UnLFxuICAgICAgdGFyZ2V0S2V5OiB0aGlzLmttc0tleSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBTMyBidWNrZXQgZm9yIGRhdGEgbGFrZVxuICAgIHRoaXMuYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRGF0YUxha2VCdWNrZXQnLCB7XG4gICAgICAvLyBFbmNyeXB0aW9uIHdpdGggY3VzdG9tZXItbWFuYWdlZCBLTVMga2V5XG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNUyxcbiAgICAgIGVuY3J5cHRpb25LZXk6IHRoaXMua21zS2V5LFxuXG4gICAgICAvLyBCbG9jayBhbGwgcHVibGljIGFjY2Vzc1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcblxuICAgICAgLy8gTGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvblxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAndHJhbnNpdGlvbi10by1pYScsXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB0cmFuc2l0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDE4MCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ2V4cGlyZS1vbGQtZGF0YScsXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBleHBpcmF0aW9uOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLFxuICAgICAgICB9LFxuICAgICAgXSxcblxuICAgICAgLy8gVmVyc2lvbmluZyBmb3IgZGF0YSBwcm90ZWN0aW9uXG4gICAgICB2ZXJzaW9uZWQ6IGZhbHNlLFxuXG4gICAgICAvLyBBdXRvLWRlbGV0ZSBvYmplY3RzIG9uIHN0YWNrIGRlbGV0aW9uIChmb3IgZGVtbyBlbnZpcm9ubWVudHMpXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgfSk7XG5cbiAgICAvLyBFeHBvcnQgYnVja2V0IG5hbWVcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YUxha2VCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBuYW1lIGZvciBkYXRhIGxha2UnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUJ1Y2tldE5hbWVgLFxuICAgIH0pO1xuXG4gICAgLy8gRXhwb3J0IEtNUyBrZXkgQVJOXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFMYWtlS21zS2V5QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMua21zS2V5LmtleUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnS01TIGtleSBBUk4gZm9yIGRhdGEgbGFrZSBlbmNyeXB0aW9uJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1LbXNLZXlBcm5gLFxuICAgIH0pO1xuICB9XG59XG4iXX0=