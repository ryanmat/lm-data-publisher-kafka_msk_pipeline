"use strict";
// ABOUTME: DeliveryStack creates Firehose delivery stream for S3 data lake ingestion
// ABOUTME: Configures compression, buffering, and IAM permissions for Lambda writer target
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
exports.DeliveryStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const firehose = __importStar(require("aws-cdk-lib/aws-kinesisfirehose"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class DeliveryStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { bucket, kmsKey } = props;
        // Create IAM role for Firehose
        const firehoseRole = new iam.Role(this, 'FirehoseRole', {
            assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
            description: 'IAM role for Firehose delivery stream to write to S3',
        });
        // Grant Firehose write permissions to S3 bucket
        bucket.grantWrite(firehoseRole);
        // Grant Firehose permissions to use KMS key
        kmsKey.grant(firehoseRole, 'kms:Decrypt', 'kms:GenerateDataKey', 'kms:DescribeKey');
        // JQ query for dynamic partitioning metadata extraction
        // Extracts: orgId, metric, and date components (year, month, day, hour) from tsUnixMs
        const jqQuery = `{
      orgId: .orgId,
      metric: .metric,
      year: (.tsUnixMs / 1000 | strftime("%Y")),
      month: (.tsUnixMs / 1000 | strftime("%m")),
      day: (.tsUnixMs / 1000 | strftime("%d")),
      hour: (.tsUnixMs / 1000 | strftime("%H"))
    }`;
        // Create Firehose delivery stream
        this.deliveryStream = new firehose.CfnDeliveryStream(this, 'DeliveryStream', {
            deliveryStreamType: 'DirectPut',
            deliveryStreamName: 'lm-datapublisher-delivery',
            extendedS3DestinationConfiguration: {
                bucketArn: bucket.bucketArn,
                roleArn: firehoseRole.roleArn,
                // Compression
                compressionFormat: 'GZIP',
                // Buffering hints (3 min, 5 MB as reasonable defaults within range)
                bufferingHints: {
                    intervalInSeconds: 180, // 3 minutes (within 1-5 min range)
                    sizeInMBs: 5, // 5 MB (within 5-32 MB range)
                },
                // Dynamic partitioning enabled
                dynamicPartitioningConfiguration: {
                    enabled: true,
                },
                // Processing configuration for metadata extraction
                processingConfiguration: {
                    enabled: true,
                    processors: [
                        {
                            type: 'MetadataExtraction',
                            parameters: [
                                {
                                    parameterName: 'MetadataExtractionQuery',
                                    parameterValue: jqQuery,
                                },
                                {
                                    parameterName: 'JsonParsingEngine',
                                    parameterValue: 'JQ-1.6',
                                },
                            ],
                        },
                    ],
                },
                // S3 prefix with dynamic partitioning keys
                // Format: data/orgId=<orgId>/metric=<metric>/<year>/<month>/<day>/<hour>/
                prefix: 'data/orgId=!{partitionKeyFromQuery:orgId}/metric=!{partitionKeyFromQuery:metric}/!{partitionKeyFromQuery:year}/!{partitionKeyFromQuery:month}/!{partitionKeyFromQuery:day}/!{partitionKeyFromQuery:hour}/',
                // Error output prefix
                errorOutputPrefix: 'errors/!{firehose:error-output-type}/!{timestamp:yyyy/MM/dd}/',
                // CloudWatch logging
                cloudWatchLoggingOptions: {
                    enabled: true,
                    logGroupName: `/aws/kinesisfirehose/lm-datapublisher-delivery`,
                    logStreamName: 'S3Delivery',
                },
            },
        });
        // Create log group for Firehose
        const logGroup = new cdk.aws_logs.LogGroup(this, 'FirehoseLogGroup', {
            logGroupName: '/aws/kinesisfirehose/lm-datapublisher-delivery',
            retention: cdk.aws_logs.RetentionDays.TWO_WEEKS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Grant Firehose permissions to write logs
        logGroup.grantWrite(firehoseRole);
        // Dependency: Firehose stream depends on role being created
        this.deliveryStream.node.addDependency(firehoseRole);
        // Export delivery stream name
        new cdk.CfnOutput(this, 'DeliveryStreamName', {
            value: this.deliveryStream.deliveryStreamName || 'lm-datapublisher-delivery',
            description: 'Firehose delivery stream name',
            exportName: `${this.stackName}-DeliveryStreamName`,
        });
        // Export delivery stream ARN
        new cdk.CfnOutput(this, 'DeliveryStreamArn', {
            value: this.deliveryStream.attrArn,
            description: 'Firehose delivery stream ARN',
            exportName: `${this.stackName}-DeliveryStreamArn`,
        });
    }
}
exports.DeliveryStack = DeliveryStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsaXZlcnktc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9pbmZyYS9saWIvZGVsaXZlcnktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFGQUFxRjtBQUNyRiwyRkFBMkY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUUzRixpREFBbUM7QUFHbkMsMEVBQTREO0FBQzVELHlEQUEyQztBQVEzQyxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUcxQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRWpDLCtCQUErQjtRQUMvQixNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0RCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUM7WUFDN0QsV0FBVyxFQUFFLHNEQUFzRDtTQUNwRSxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVoQyw0Q0FBNEM7UUFDNUMsTUFBTSxDQUFDLEtBQUssQ0FDVixZQUFZLEVBQ1osYUFBYSxFQUNiLHFCQUFxQixFQUNyQixpQkFBaUIsQ0FDbEIsQ0FBQztRQUVGLHdEQUF3RDtRQUN4RCxzRkFBc0Y7UUFDdEYsTUFBTSxPQUFPLEdBQUc7Ozs7Ozs7TUFPZCxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzNFLGtCQUFrQixFQUFFLFdBQVc7WUFDL0Isa0JBQWtCLEVBQUUsMkJBQTJCO1lBQy9DLGtDQUFrQyxFQUFFO2dCQUNsQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQzNCLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztnQkFFN0IsY0FBYztnQkFDZCxpQkFBaUIsRUFBRSxNQUFNO2dCQUV6QixvRUFBb0U7Z0JBQ3BFLGNBQWMsRUFBRTtvQkFDZCxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsbUNBQW1DO29CQUMzRCxTQUFTLEVBQUUsQ0FBQyxFQUFFLDhCQUE4QjtpQkFDN0M7Z0JBRUQsK0JBQStCO2dCQUMvQixnQ0FBZ0MsRUFBRTtvQkFDaEMsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBRUQsbURBQW1EO2dCQUNuRCx1QkFBdUIsRUFBRTtvQkFDdkIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsVUFBVSxFQUFFO3dCQUNWOzRCQUNFLElBQUksRUFBRSxvQkFBb0I7NEJBQzFCLFVBQVUsRUFBRTtnQ0FDVjtvQ0FDRSxhQUFhLEVBQUUseUJBQXlCO29DQUN4QyxjQUFjLEVBQUUsT0FBTztpQ0FDeEI7Z0NBQ0Q7b0NBQ0UsYUFBYSxFQUFFLG1CQUFtQjtvQ0FDbEMsY0FBYyxFQUFFLFFBQVE7aUNBQ3pCOzZCQUNGO3lCQUNGO3FCQUNGO2lCQUNGO2dCQUVELDJDQUEyQztnQkFDM0MsMEVBQTBFO2dCQUMxRSxNQUFNLEVBQUUsMk1BQTJNO2dCQUVuTixzQkFBc0I7Z0JBQ3RCLGlCQUFpQixFQUFFLCtEQUErRDtnQkFFbEYscUJBQXFCO2dCQUNyQix3QkFBd0IsRUFBRTtvQkFDeEIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsWUFBWSxFQUFFLGdEQUFnRDtvQkFDOUQsYUFBYSxFQUFFLFlBQVk7aUJBQzVCO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxnQ0FBZ0M7UUFDaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDbkUsWUFBWSxFQUFFLGdEQUFnRDtZQUM5RCxTQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUztZQUMvQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILDJDQUEyQztRQUMzQyxRQUFRLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRWxDLDREQUE0RDtRQUM1RCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFckQsOEJBQThCO1FBQzlCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLElBQUksMkJBQTJCO1lBQzVFLFdBQVcsRUFBRSwrQkFBK0I7WUFDNUMsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMscUJBQXFCO1NBQ25ELENBQUMsQ0FBQztRQUVILDZCQUE2QjtRQUM3QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU87WUFDbEMsV0FBVyxFQUFFLDhCQUE4QjtZQUMzQyxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxvQkFBb0I7U0FDbEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBekhELHNDQXlIQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEFCT1VUTUU6IERlbGl2ZXJ5U3RhY2sgY3JlYXRlcyBGaXJlaG9zZSBkZWxpdmVyeSBzdHJlYW0gZm9yIFMzIGRhdGEgbGFrZSBpbmdlc3Rpb25cbi8vIEFCT1VUTUU6IENvbmZpZ3VyZXMgY29tcHJlc3Npb24sIGJ1ZmZlcmluZywgYW5kIElBTSBwZXJtaXNzaW9ucyBmb3IgTGFtYmRhIHdyaXRlciB0YXJnZXRcblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XG5pbXBvcnQgKiBhcyBmaXJlaG9zZSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta2luZXNpc2ZpcmVob3NlJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERlbGl2ZXJ5U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgcmVhZG9ubHkgYnVja2V0OiBzMy5JQnVja2V0O1xuICByZWFkb25seSBrbXNLZXk6IGttcy5JS2V5O1xufVxuXG5leHBvcnQgY2xhc3MgRGVsaXZlcnlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBkZWxpdmVyeVN0cmVhbTogZmlyZWhvc2UuQ2ZuRGVsaXZlcnlTdHJlYW07XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IERlbGl2ZXJ5U3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBidWNrZXQsIGttc0tleSB9ID0gcHJvcHM7XG5cbiAgICAvLyBDcmVhdGUgSUFNIHJvbGUgZm9yIEZpcmVob3NlXG4gICAgY29uc3QgZmlyZWhvc2VSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdGaXJlaG9zZVJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZmlyZWhvc2UuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgRmlyZWhvc2UgZGVsaXZlcnkgc3RyZWFtIHRvIHdyaXRlIHRvIFMzJyxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IEZpcmVob3NlIHdyaXRlIHBlcm1pc3Npb25zIHRvIFMzIGJ1Y2tldFxuICAgIGJ1Y2tldC5ncmFudFdyaXRlKGZpcmVob3NlUm9sZSk7XG5cbiAgICAvLyBHcmFudCBGaXJlaG9zZSBwZXJtaXNzaW9ucyB0byB1c2UgS01TIGtleVxuICAgIGttc0tleS5ncmFudChcbiAgICAgIGZpcmVob3NlUm9sZSxcbiAgICAgICdrbXM6RGVjcnlwdCcsXG4gICAgICAna21zOkdlbmVyYXRlRGF0YUtleScsXG4gICAgICAna21zOkRlc2NyaWJlS2V5J1xuICAgICk7XG5cbiAgICAvLyBKUSBxdWVyeSBmb3IgZHluYW1pYyBwYXJ0aXRpb25pbmcgbWV0YWRhdGEgZXh0cmFjdGlvblxuICAgIC8vIEV4dHJhY3RzOiBvcmdJZCwgbWV0cmljLCBhbmQgZGF0ZSBjb21wb25lbnRzICh5ZWFyLCBtb250aCwgZGF5LCBob3VyKSBmcm9tIHRzVW5peE1zXG4gICAgY29uc3QganFRdWVyeSA9IGB7XG4gICAgICBvcmdJZDogLm9yZ0lkLFxuICAgICAgbWV0cmljOiAubWV0cmljLFxuICAgICAgeWVhcjogKC50c1VuaXhNcyAvIDEwMDAgfCBzdHJmdGltZShcIiVZXCIpKSxcbiAgICAgIG1vbnRoOiAoLnRzVW5peE1zIC8gMTAwMCB8IHN0cmZ0aW1lKFwiJW1cIikpLFxuICAgICAgZGF5OiAoLnRzVW5peE1zIC8gMTAwMCB8IHN0cmZ0aW1lKFwiJWRcIikpLFxuICAgICAgaG91cjogKC50c1VuaXhNcyAvIDEwMDAgfCBzdHJmdGltZShcIiVIXCIpKVxuICAgIH1gO1xuXG4gICAgLy8gQ3JlYXRlIEZpcmVob3NlIGRlbGl2ZXJ5IHN0cmVhbVxuICAgIHRoaXMuZGVsaXZlcnlTdHJlYW0gPSBuZXcgZmlyZWhvc2UuQ2ZuRGVsaXZlcnlTdHJlYW0odGhpcywgJ0RlbGl2ZXJ5U3RyZWFtJywge1xuICAgICAgZGVsaXZlcnlTdHJlYW1UeXBlOiAnRGlyZWN0UHV0JyxcbiAgICAgIGRlbGl2ZXJ5U3RyZWFtTmFtZTogJ2xtLWRhdGFwdWJsaXNoZXItZGVsaXZlcnknLFxuICAgICAgZXh0ZW5kZWRTM0Rlc3RpbmF0aW9uQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBidWNrZXRBcm46IGJ1Y2tldC5idWNrZXRBcm4sXG4gICAgICAgIHJvbGVBcm46IGZpcmVob3NlUm9sZS5yb2xlQXJuLFxuXG4gICAgICAgIC8vIENvbXByZXNzaW9uXG4gICAgICAgIGNvbXByZXNzaW9uRm9ybWF0OiAnR1pJUCcsXG5cbiAgICAgICAgLy8gQnVmZmVyaW5nIGhpbnRzICgzIG1pbiwgNSBNQiBhcyByZWFzb25hYmxlIGRlZmF1bHRzIHdpdGhpbiByYW5nZSlcbiAgICAgICAgYnVmZmVyaW5nSGludHM6IHtcbiAgICAgICAgICBpbnRlcnZhbEluU2Vjb25kczogMTgwLCAvLyAzIG1pbnV0ZXMgKHdpdGhpbiAxLTUgbWluIHJhbmdlKVxuICAgICAgICAgIHNpemVJbk1CczogNSwgLy8gNSBNQiAod2l0aGluIDUtMzIgTUIgcmFuZ2UpXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gRHluYW1pYyBwYXJ0aXRpb25pbmcgZW5hYmxlZFxuICAgICAgICBkeW5hbWljUGFydGl0aW9uaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gUHJvY2Vzc2luZyBjb25maWd1cmF0aW9uIGZvciBtZXRhZGF0YSBleHRyYWN0aW9uXG4gICAgICAgIHByb2Nlc3NpbmdDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBwcm9jZXNzb3JzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHR5cGU6ICdNZXRhZGF0YUV4dHJhY3Rpb24nLFxuICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyTmFtZTogJ01ldGFkYXRhRXh0cmFjdGlvblF1ZXJ5JyxcbiAgICAgICAgICAgICAgICAgIHBhcmFtZXRlclZhbHVlOiBqcVF1ZXJ5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyTmFtZTogJ0pzb25QYXJzaW5nRW5naW5lJyxcbiAgICAgICAgICAgICAgICAgIHBhcmFtZXRlclZhbHVlOiAnSlEtMS42JyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFMzIHByZWZpeCB3aXRoIGR5bmFtaWMgcGFydGl0aW9uaW5nIGtleXNcbiAgICAgICAgLy8gRm9ybWF0OiBkYXRhL29yZ0lkPTxvcmdJZD4vbWV0cmljPTxtZXRyaWM+Lzx5ZWFyPi88bW9udGg+LzxkYXk+Lzxob3VyPi9cbiAgICAgICAgcHJlZml4OiAnZGF0YS9vcmdJZD0he3BhcnRpdGlvbktleUZyb21RdWVyeTpvcmdJZH0vbWV0cmljPSF7cGFydGl0aW9uS2V5RnJvbVF1ZXJ5Om1ldHJpY30vIXtwYXJ0aXRpb25LZXlGcm9tUXVlcnk6eWVhcn0vIXtwYXJ0aXRpb25LZXlGcm9tUXVlcnk6bW9udGh9LyF7cGFydGl0aW9uS2V5RnJvbVF1ZXJ5OmRheX0vIXtwYXJ0aXRpb25LZXlGcm9tUXVlcnk6aG91cn0vJyxcblxuICAgICAgICAvLyBFcnJvciBvdXRwdXQgcHJlZml4XG4gICAgICAgIGVycm9yT3V0cHV0UHJlZml4OiAnZXJyb3JzLyF7ZmlyZWhvc2U6ZXJyb3Itb3V0cHV0LXR5cGV9LyF7dGltZXN0YW1wOnl5eXkvTU0vZGR9LycsXG5cbiAgICAgICAgLy8gQ2xvdWRXYXRjaCBsb2dnaW5nXG4gICAgICAgIGNsb3VkV2F0Y2hMb2dnaW5nT3B0aW9uczoge1xuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9raW5lc2lzZmlyZWhvc2UvbG0tZGF0YXB1Ymxpc2hlci1kZWxpdmVyeWAsXG4gICAgICAgICAgbG9nU3RyZWFtTmFtZTogJ1MzRGVsaXZlcnknLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBsb2cgZ3JvdXAgZm9yIEZpcmVob3NlXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgY2RrLmF3c19sb2dzLkxvZ0dyb3VwKHRoaXMsICdGaXJlaG9zZUxvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiAnL2F3cy9raW5lc2lzZmlyZWhvc2UvbG0tZGF0YXB1Ymxpc2hlci1kZWxpdmVyeScsXG4gICAgICByZXRlbnRpb246IGNkay5hd3NfbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBGaXJlaG9zZSBwZXJtaXNzaW9ucyB0byB3cml0ZSBsb2dzXG4gICAgbG9nR3JvdXAuZ3JhbnRXcml0ZShmaXJlaG9zZVJvbGUpO1xuXG4gICAgLy8gRGVwZW5kZW5jeTogRmlyZWhvc2Ugc3RyZWFtIGRlcGVuZHMgb24gcm9sZSBiZWluZyBjcmVhdGVkXG4gICAgdGhpcy5kZWxpdmVyeVN0cmVhbS5ub2RlLmFkZERlcGVuZGVuY3koZmlyZWhvc2VSb2xlKTtcblxuICAgIC8vIEV4cG9ydCBkZWxpdmVyeSBzdHJlYW0gbmFtZVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEZWxpdmVyeVN0cmVhbU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kZWxpdmVyeVN0cmVhbS5kZWxpdmVyeVN0cmVhbU5hbWUgfHwgJ2xtLWRhdGFwdWJsaXNoZXItZGVsaXZlcnknLFxuICAgICAgZGVzY3JpcHRpb246ICdGaXJlaG9zZSBkZWxpdmVyeSBzdHJlYW0gbmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tRGVsaXZlcnlTdHJlYW1OYW1lYCxcbiAgICB9KTtcblxuICAgIC8vIEV4cG9ydCBkZWxpdmVyeSBzdHJlYW0gQVJOXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RlbGl2ZXJ5U3RyZWFtQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGVsaXZlcnlTdHJlYW0uYXR0ckFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnRmlyZWhvc2UgZGVsaXZlcnkgc3RyZWFtIEFSTicsXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tRGVsaXZlcnlTdHJlYW1Bcm5gLFxuICAgIH0pO1xuICB9XG59XG4iXX0=