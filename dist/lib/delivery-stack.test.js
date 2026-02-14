"use strict";
// ABOUTME: Tests for DeliveryStack (Firehose → S3)
// ABOUTME: Validates Firehose stream configuration, compression, buffering, and IAM grants
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
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const storage_stack_1 = require("./storage-stack");
const delivery_stack_1 = require("./delivery-stack");
const nag_test_helper_1 = require("./nag-test-helper");
describe('DeliveryStack', () => {
    let app;
    let storageStack;
    let deliveryStack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        storageStack = new storage_stack_1.StorageStack(app, 'TestStorageStack', {
            env: { account: '123456789012', region: 'us-west-2' },
        });
        deliveryStack = new delivery_stack_1.DeliveryStack(app, 'TestDeliveryStack', {
            env: { account: '123456789012', region: 'us-west-2' },
            bucket: storageStack.bucket,
            kmsKey: storageStack.kmsKey,
        });
        template = assertions_1.Template.fromStack(deliveryStack);
    });
    test('Stack synthesizes successfully', () => {
        expect(template).toBeDefined();
    });
    test('Creates Firehose delivery stream', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            DeliveryStreamType: 'DirectPut',
        });
    });
    test('Configures S3 destination with bucket from StorageStack', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            ExtendedS3DestinationConfiguration: assertions_1.Match.objectLike({
                BucketARN: assertions_1.Match.anyValue(),
            }),
        });
    });
    test('Enables gzip compression', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            ExtendedS3DestinationConfiguration: assertions_1.Match.objectLike({
                CompressionFormat: 'GZIP',
            }),
        });
    });
    test('Configures buffering hints within specified range', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            ExtendedS3DestinationConfiguration: assertions_1.Match.objectLike({
                BufferingHints: {
                    IntervalInSeconds: assertions_1.Match.anyValue(),
                    SizeInMBs: assertions_1.Match.anyValue(),
                },
            }),
        });
        // Extract actual values to verify they're in range
        const resources = template.findResources('AWS::KinesisFirehose::DeliveryStream');
        const deliveryStream = Object.values(resources)[0];
        const bufferingHints = deliveryStream.Properties.ExtendedS3DestinationConfiguration.BufferingHints;
        expect(bufferingHints.IntervalInSeconds).toBeGreaterThanOrEqual(60); // 1 min
        expect(bufferingHints.IntervalInSeconds).toBeLessThanOrEqual(300); // 5 min
        expect(bufferingHints.SizeInMBs).toBeGreaterThanOrEqual(5);
        expect(bufferingHints.SizeInMBs).toBeLessThanOrEqual(32);
    });
    test('Creates IAM role for Firehose', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: assertions_1.Match.objectLike({
                Statement: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'firehose.amazonaws.com',
                        },
                    }),
                ]),
            }),
        });
    });
    test('Grants Firehose write permissions to S3 bucket', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: assertions_1.Match.objectLike({
                Statement: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Action: assertions_1.Match.arrayWith([
                            's3:PutObject',
                        ]),
                        Effect: 'Allow',
                    }),
                ]),
            }),
        });
    });
    test('Grants Firehose permissions to use KMS key', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: assertions_1.Match.objectLike({
                Statement: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Action: assertions_1.Match.arrayWith([
                            'kms:Decrypt',
                            'kms:GenerateDataKey',
                        ]),
                        Effect: 'Allow',
                    }),
                ]),
            }),
        });
    });
    test('Configures error output prefix', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            ExtendedS3DestinationConfiguration: assertions_1.Match.objectLike({
                ErrorOutputPrefix: assertions_1.Match.stringLikeRegexp('.*error.*'),
            }),
        });
    });
    test('Exports delivery stream name as output', () => {
        template.hasOutput('DeliveryStreamName', {
            Description: assertions_1.Match.stringLikeRegexp('.*Firehose.*'),
        });
    });
    test('Exports delivery stream ARN as output', () => {
        template.hasOutput('DeliveryStreamArn', {
            Description: assertions_1.Match.stringLikeRegexp('.*Firehose.*'),
        });
    });
    test('Enables dynamic partitioning', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            ExtendedS3DestinationConfiguration: assertions_1.Match.objectLike({
                DynamicPartitioningConfiguration: {
                    Enabled: true,
                },
            }),
        });
    });
    test('Configures processing configuration for dynamic partitioning', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            ExtendedS3DestinationConfiguration: assertions_1.Match.objectLike({
                ProcessingConfiguration: {
                    Enabled: true,
                    Processors: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Type: 'MetadataExtraction',
                            Parameters: assertions_1.Match.arrayWith([
                                assertions_1.Match.objectLike({
                                    ParameterName: 'MetadataExtractionQuery',
                                }),
                                assertions_1.Match.objectLike({
                                    ParameterName: 'JsonParsingEngine',
                                    ParameterValue: 'JQ-1.6',
                                }),
                            ]),
                        }),
                    ]),
                },
            }),
        });
    });
    test('Configures JQ expressions for orgId, metric, and date partitioning', () => {
        const resources = template.findResources('AWS::KinesisFirehose::DeliveryStream');
        const deliveryStream = Object.values(resources)[0];
        const processors = deliveryStream.Properties.ExtendedS3DestinationConfiguration.ProcessingConfiguration.Processors;
        const metadataProcessor = processors.find((p) => p.Type === 'MetadataExtraction');
        expect(metadataProcessor).toBeDefined();
        const queryParam = metadataProcessor.Parameters.find((p) => p.ParameterName === 'MetadataExtractionQuery');
        expect(queryParam).toBeDefined();
        const jqQuery = queryParam.ParameterValue;
        // Verify the JQ query extracts orgId, metric, and date fields
        expect(jqQuery).toContain('orgId');
        expect(jqQuery).toContain('metric');
        expect(jqQuery).toContain('year');
        expect(jqQuery).toContain('month');
        expect(jqQuery).toContain('day');
        expect(jqQuery).toContain('hour');
    });
    test('Configures S3 prefix with dynamic partitioning keys', () => {
        template.hasResourceProperties('AWS::KinesisFirehose::DeliveryStream', {
            ExtendedS3DestinationConfiguration: assertions_1.Match.objectLike({
                Prefix: assertions_1.Match.stringLikeRegexp('.*orgId.*metric.*'),
            }),
        });
    });
    test('No CDK Nag High severity findings', () => {
        (0, nag_test_helper_1.applyNagChecks)(deliveryStack);
        (0, nag_test_helper_1.assertNoHighFindings)(deliveryStack);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsaXZlcnktc3RhY2sudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2luZnJhL2xpYi9kZWxpdmVyeS1zdGFjay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtREFBbUQ7QUFDbkQsMkZBQTJGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUUzRixpREFBbUM7QUFDbkMsdURBQXlEO0FBQ3pELG1EQUErQztBQUMvQyxxREFBaUQ7QUFDakQsdURBQXlFO0FBRXpFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzdCLElBQUksR0FBWSxDQUFDO0lBQ2pCLElBQUksWUFBMEIsQ0FBQztJQUMvQixJQUFJLGFBQTRCLENBQUM7SUFDakMsSUFBSSxRQUFrQixDQUFDO0lBRXZCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDcEIsWUFBWSxHQUFHLElBQUksNEJBQVksQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLEVBQUU7WUFDdkQsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFO1NBQ3RELENBQUMsQ0FBQztRQUNILGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLG1CQUFtQixFQUFFO1lBQzFELEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRTtZQUNyRCxNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07WUFDM0IsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO1NBQzVCLENBQUMsQ0FBQztRQUNILFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDMUMsTUFBTSxD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akMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDL0QsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNDQUFzQyxFQUFFO1lBQ3JFLGtDQUFrQyxFQUFFLGtCQUFLLENBQUMsVUFBVSxDQUFDO2dCQUNuRCxNQUFNLEVBQUUsa0JBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQzthQUNwRCxDQUFDO1NBQ0gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzdDLElBQUEsZ0NBQWMsRUFBQyxhQUFhLENBQUMsQ0FBQztRQUM5QixJQUFBLHNDQUFvQixFQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBQk9VVE1FOiBUZXN0cyBmb3IgRGVsaXZlcnlTdGFjayAoRmlyZWhvc2Ug4oaSIFMzKVxuLy8gQUJPVVRNRTogVmFsaWRhdGVzIEZpcmVob3NlIHN0cmVhbSBjb25maWd1cmF0aW9uLCBjb21wcmVzc2lvbiwgYnVmZmVyaW5nLCBhbmQgSUFNIGdyYW50c1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBTdG9yYWdlU3RhY2sgfSBmcm9tICcuL3N0b3JhZ2Utc3RhY2snO1xuaW1wb3J0IHsgRGVsaXZlcnlTdGFjayB9IGZyb20gJy4vZGVsaXZlcnktc3RhY2snO1xuaW1wb3J0IHsgYXBwbHlOYWdDaGVja3MsIGFzc2VydE5vSGlnaEZpbmRpbmdzIH0gZnJvbSAnLi9uYWctdGVzdC1oZWxwZXInO1xuXG5kZXNjcmliZSgnRGVsaXZlcnlTdGFjaycsICgpID0+IHtcbiAgbGV0IGFwcDogY2RrLkFwcDtcbiAgbGV0IHN0b3JhZ2VTdGFjazogU3RvcmFnZVN0YWNrO1xuICBsZXQgZGVsaXZlcnlTdGFjazogRGVsaXZlcnlTdGFjaztcbiAgbGV0IHRlbXBsYXRlOiBUZW1wbGF0ZTtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIHN0b3JhZ2VTdGFjayA9IG5ldyBTdG9yYWdlU3RhY2soYXBwLCAnVGVzdFN0b3JhZ2VTdGFjaycsIHtcbiAgICAgIGVudjogeyBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJywgcmVnaW9uOiAndXMtd2VzdC0yJyB9LFxuICAgIH0pO1xuICAgIGRlbGl2ZXJ5U3RhY2sgPSBuZXcgRGVsaXZlcnlTdGFjayhhcHAsICdUZXN0RGVsaXZlcnlTdGFjaycsIHtcbiAgICAgIGVudjogeyBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJywgcmVnaW9uOiAndXMtd2VzdC0yJyB9LFxuICAgICAgYnVja2V0OiBzdG9yYWdlU3RhY2suYnVja2V0LFxuICAgICAga21zS2V5OiBzdG9yYWdlU3RhY2sua21zS2V5LFxuICAgIH0pO1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGRlbGl2ZXJ5U3RhY2spO1xuICB9KTtcblxuICB0ZXN0KCdTdGFjayBzeW50aGVzaXplcyBzdWNjZXNzZnVsbHknLCAoKSA9PiB7XG4gICAgZXhwZWN0KHRlbXBsYXRlKS50b0JlRGVmaW5lZCgpO1xuICB9KTtcblxuICB0ZXN0KCdDcmVhdGVzIEZpcmVob3NlIGRlbGl2ZXJ5IHN0cmVhbScsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6S2luZXNpc0ZpcmVob3NlOjpEZWxpdmVyeVN0cmVhbScsIHtcbiAgICAgIERlbGl2ZXJ5U3RyZWFtVHlwZTogJ0RpcmVjdFB1dCcsXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0NvbmZpZ3VyZXMgUzMgZGVzdGluYXRpb24gd2l0aCBidWNrZXQgZnJvbSBTdG9yYWdlU3RhY2snLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OktpbmVzaXNGaXJlaG9zZTo6RGVsaXZlcnlTdHJlYW0nLCB7XG4gICAgICBFeHRlbmRlZFMzRGVzdGluYXRpb25Db25maWd1cmF0aW9uOiBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgQnVja2V0QVJOOiBNYXRjaC5hbnlWYWx1ZSgpLFxuICAgICAgfSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0VuYWJsZXMgZ3ppcCBjb21wcmVzc2lvbicsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6S2luZXNpc0ZpcmVob3NlOjpEZWxpdmVyeVN0cmVhbScsIHtcbiAgICAgIEV4dGVuZGVkUzNEZXN0aW5hdGlvbkNvbmZpZ3VyYXRpb246IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICBDb21wcmVzc2lvbkZvcm1hdDogJ0daSVAnLFxuICAgICAgfSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0NvbmZpZ3VyZXMgYnVmZmVyaW5nIGhpbnRzIHdpdGhpbiBzcGVjaWZpZWQgcmFuZ2UnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OktpbmVzaXNGaXJlaG9zZTo6RGVsaXZlcnlTdHJlYW0nLCB7XG4gICAgICBFeHRlbmRlZFMzRGVzdGluYXRpb25Db25maWd1cmF0aW9uOiBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgQnVmZmVyaW5nSGludHM6IHtcbiAgICAgICAgICBJbnRlcnZhbEluU2Vjb25kczogTWF0Y2guYW55VmFsdWUoKSxcbiAgICAgICAgICBTaXplSW5NQnM6IE1hdGNoLmFueVZhbHVlKCksXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIC8vIEV4dHJhY3QgYWN0dWFsIHZhbHVlcyB0byB2ZXJpZnkgdGhleSdyZSBpbiByYW5nZVxuICAgIGNvbnN0IHJlc291cmNlcyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6S2luZXNpc0ZpcmVob3NlOjpEZWxpdmVyeVN0cmVhbScpO1xuICAgIGNvbnN0IGRlbGl2ZXJ5U3RyZWFtID0gT2JqZWN0LnZhbHVlcyhyZXNvdXJjZXMpWzBdO1xuICAgIGNvbnN0IGJ1ZmZlcmluZ0hpbnRzID0gZGVsaXZlcnlTdHJlYW0uUHJvcGVydGllcy5FeHRlbmRlZFMzRGVzdGluYXRpb25Db25maWd1cmF0aW9uLkJ1ZmZlcmluZ0hpbnRzO1xuXG4gICAgZXhwZWN0KGJ1ZmZlcmluZ0hpbnRzLkludGVydmFsSW5TZWNvbmRzKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDYwKTsgLy8gMSBtaW5cbiAgICBleHBlY3QoYnVmZmVyaW5nSGludHMuSW50ZXJ2YWxJblNlY29uZHMpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMzAwKTsgLy8gNSBtaW5cbiAgICBleHBlY3QoYnVmZmVyaW5nSGludHMuU2l6ZUluTUJzKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDUpO1xuICAgIGV4cGVjdChidWZmZXJpbmdIaW50cy5TaXplSW5NQnMpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMzIpO1xuICB9KTtcblxuICB0ZXN0KCdDcmVhdGVzIElBTSByb2xlIGZvciBGaXJlaG9zZScsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpSb2xlJywge1xuICAgICAgQXNzdW1lUm9sZVBvbGljeURvY3VtZW50OiBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgU3RhdGVtZW50OiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgQWN0aW9uOiAnc3RzOkFzc3VtZVJvbGUnLFxuICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgUHJpbmNpcGFsOiB7XG4gICAgICAgICAgICAgIFNlcnZpY2U6ICdmaXJlaG9zZS5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLFxuICAgICAgfSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0dyYW50cyBGaXJlaG9zZSB3cml0ZSBwZXJtaXNzaW9ucyB0byBTMyBidWNrZXQnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgUG9saWN5RG9jdW1lbnQ6IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICBTdGF0ZW1lbnQ6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBBY3Rpb246IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLFxuICAgICAgfSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0dyYW50cyBGaXJlaG9zZSBwZXJtaXNzaW9ucyB0byB1c2UgS01TIGtleScsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgICBQb2xpY3lEb2N1bWVudDogTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgIFN0YXRlbWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgIEFjdGlvbjogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgICAgJ2ttczpEZWNyeXB0JyxcbiAgICAgICAgICAgICAgJ2ttczpHZW5lcmF0ZURhdGFLZXknLFxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLFxuICAgICAgfSksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0NvbmZpZ3VyZXMgZXJyb3Igb3V0cHV0IHByZWZpeCcsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6S2luZXNpc0ZpcmVob3NlOjpEZWxpdmVyeVN0cmVhbScsIHtcbiAgICAgIEV4dGVuZGVkUzNEZXN0aW5hdGlvbkNvbmZpZ3VyYXRpb246IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICBFcnJvck91dHB1dFByZWZpeDogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnLiplcnJvci4qJyksXG4gICAgICB9KSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnRXhwb3J0cyBkZWxpdmVyeSBzdHJlYW0gbmFtZSBhcyBvdXRwdXQnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdEZWxpdmVyeVN0cmVhbU5hbWUnLCB7XG4gICAgICBEZXNjcmlwdGlvbjogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnLipGaXJlaG9zZS4qJyksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0V4cG9ydHMgZGVsaXZlcnkgc3RyZWFtIEFSTiBhcyBvdXRwdXQnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdEZWxpdmVyeVN0cmVhbUFybicsIHtcbiAgICAgIERlc2NyaXB0aW9uOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCcuKkZpcmVob3NlLionKSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnRW5hYmxlcyBkeW5hbWljIHBhcnRpdGlvbmluZycsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6S2luZXNpc0ZpcmVob3NlOjpEZWxpdmVyeVN0cmVhbScsIHtcbiAgICAgIEV4dGVuZGVkUzNEZXN0aW5hdGlvbkNvbmZpZ3VyYXRpb246IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICBEeW5hbWljUGFydGl0aW9uaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIEVuYWJsZWQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnQ29uZmlndXJlcyBwcm9jZXNzaW5nIGNvbmZpZ3VyYXRpb24gZm9yIGR5bmFtaWMgcGFydGl0aW9uaW5nJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpLaW5lc2lzRmlyZWhvc2U6OkRlbGl2ZXJ5U3RyZWFtJywge1xuICAgICAgRXh0ZW5kZWRTM0Rlc3RpbmF0aW9uQ29uZmlndXJhdGlvbjogTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgIFByb2Nlc3NpbmdDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBQcm9jZXNzb3JzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgIFR5cGU6ICdNZXRhZGF0YUV4dHJhY3Rpb24nLFxuICAgICAgICAgICAgICBQYXJhbWV0ZXJzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICAgICAgUGFyYW1ldGVyTmFtZTogJ01ldGFkYXRhRXh0cmFjdGlvblF1ZXJ5JyxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgICAgICAgIFBhcmFtZXRlck5hbWU6ICdKc29uUGFyc2luZ0VuZ2luZScsXG4gICAgICAgICAgICAgICAgICBQYXJhbWV0ZXJWYWx1ZTogJ0pRLTEuNicsXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSksXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnQ29uZmlndXJlcyBKUSBleHByZXNzaW9ucyBmb3Igb3JnSWQsIG1ldHJpYywgYW5kIGRhdGUgcGFydGl0aW9uaW5nJywgKCkgPT4ge1xuICAgIGNvbnN0IHJlc291cmNlcyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6S2luZXNpc0ZpcmVob3NlOjpEZWxpdmVyeVN0cmVhbScpO1xuICAgIGNvbnN0IGRlbGl2ZXJ5U3RyZWFtID0gT2JqZWN0LnZhbHVlcyhyZXNvdXJjZXMpWzBdO1xuICAgIGNvbnN0IHByb2Nlc3NvcnMgPSBkZWxpdmVyeVN0cmVhbS5Qcm9wZXJ0aWVzLkV4dGVuZGVkUzNEZXN0aW5hdGlvbkNvbmZpZ3VyYXRpb24uUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb24uUHJvY2Vzc29ycztcblxuICAgIGNvbnN0IG1ldGFkYXRhUHJvY2Vzc29yID0gcHJvY2Vzc29ycy5maW5kKChwOiBhbnkpID0+IHAuVHlwZSA9PT0gJ01ldGFkYXRhRXh0cmFjdGlvbicpO1xuICAgIGV4cGVjdChtZXRhZGF0YVByb2Nlc3NvcikudG9CZURlZmluZWQoKTtcblxuICAgIGNvbnN0IHF1ZXJ5UGFyYW0gPSBtZXRhZGF0YVByb2Nlc3Nvci5QYXJhbWV0ZXJzLmZpbmQoKHA6IGFueSkgPT4gcC5QYXJhbWV0ZXJOYW1lID09PSAnTWV0YWRhdGFFeHRyYWN0aW9uUXVlcnknKTtcbiAgICBleHBlY3QocXVlcnlQYXJhbSkudG9CZURlZmluZWQoKTtcblxuICAgIGNvbnN0IGpxUXVlcnkgPSBxdWVyeVBhcmFtLlBhcmFtZXRlclZhbHVlO1xuXG4gICAgLy8gVmVyaWZ5IHRoZSBKUSBxdWVyeSBleHRyYWN0cyBvcmdJZCwgbWV0cmljLCBhbmQgZGF0ZSBmaWVsZHNcbiAgICBleHBlY3QoanFRdWVyeSkudG9Db250YWluKCdvcmdJZCcpO1xuICAgIGV4cGVjdChqcVF1ZXJ5KS50b0NvbnRhaW4oJ21ldHJpYycpO1xuICAgIGV4cGVjdChqcVF1ZXJ5KS50b0NvbnRhaW4oJ3llYXInKTtcbiAgICBleHBlY3QoanFRdWVyeSkudG9Db250YWluKCdtb250aCcpO1xuICAgIGV4cGVjdChqcVF1ZXJ5KS50b0NvbnRhaW4oJ2RheScpO1xuICAgIGV4cGVjdChqcVF1ZXJ5KS50b0NvbnRhaW4oJ2hvdXInKTtcbiAgfSk7XG5cbiAgdGVzdCgnQ29uZmlndXJlcyBTMyBwcmVmaXggd2l0aCBkeW5hbWljIHBhcnRpdGlvbmluZyBrZXlzJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpLaW5lc2lzRmlyZWhvc2U6OkRlbGl2ZXJ5U3RyZWFtJywge1xuICAgICAgRXh0ZW5kZWRTM0Rlc3RpbmF0aW9uQ29uZmlndXJhdGlvbjogTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgIFByZWZpeDogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnLipvcmdJZC4qbWV0cmljLionKSxcbiAgICAgIH0pLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdObyBDREsgTmFnIEhpZ2ggc2V2ZXJpdHkgZmluZGluZ3MnLCAoKSA9PiB7XG4gICAgYXBwbHlOYWdDaGVja3MoZGVsaXZlcnlTdGFjayk7XG4gICAgYXNzZXJ0Tm9IaWdoRmluZGluZ3MoZGVsaXZlcnlTdGFjayk7XG4gIH0pO1xufSk7XG4iXX0=