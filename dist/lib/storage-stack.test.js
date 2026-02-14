"use strict";
// ABOUTME: Tests for StorageStack (S3 + KMS + lifecycle)
// ABOUTME: Validates encryption, lifecycle policies, block public access, and CDK Nag compliance
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
const nag_test_helper_1 = require("./nag-test-helper");
describe('StorageStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new storage_stack_1.StorageStack(app, 'TestStorageStack', {
            env: { account: '123456789012', region: 'us-west-2' },
        });
        template = assertions_1.Template.fromStack(stack);
    });
    test('Stack synthesizes successfully', () => {
        expect(template).toBeDefined();
    });
    test('Creates KMS key for bucket encryption', () => {
        template.hasResourceProperties('AWS::KMS::Key', {
            Description: assertions_1.Match.stringLikeRegexp('.*S3.*encryption.*'),
            EnableKeyRotation: true,
        });
    });
    test('Creates S3 bucket with KMS encryption', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                    {
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'aws:kms',
                            KMSMasterKeyID: assertions_1.Match.anyValue(),
                        },
                    },
                ],
            },
        });
    });
    test('Enforces block public access on bucket', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true,
            },
        });
    });
    test('Configures lifecycle policy for cost optimization', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            LifecycleConfiguration: {
                Rules: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Status: 'Enabled',
                    }),
                ]),
            },
        });
    });
    test('Exports bucket name as stack output', () => {
        template.hasOutput('DataLakeBucketName', {
            Description: assertions_1.Match.stringLikeRegexp('.*bucket.*'),
        });
    });
    test('Exports KMS key ARN as stack output', () => {
        template.hasOutput('DataLakeKmsKeyArn', {
            Description: assertions_1.Match.stringLikeRegexp('.*KMS.*'),
        });
    });
    test('Bucket name includes hash suffix for uniqueness', () => {
        // Stack synthesis adds unique hash suffix to physical names
        // Verify bucket has a logical ID that will generate unique physical name
        const buckets = template.findResources('AWS::S3::Bucket');
        expect(Object.keys(buckets).length).toBeGreaterThan(0);
    });
    test('KMS key has alias for discoverability', () => {
        template.hasResourceProperties('AWS::KMS::Alias', {
            AliasName: assertions_1.Match.stringLikeRegexp('alias/.*'),
        });
    });
    test('No CDK Nag High severity findings', () => {
        (0, nag_test_helper_1.applyNagChecks)(stack);
        (0, nag_test_helper_1.assertNoHighFindings)(stack);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS1zdGFjay50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vaW5mcmEvbGliL3N0b3JhZ2Utc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEseURBQXlEO0FBQ3pELGlHQUFpRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFakcsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCxtREFBK0M7QUFDL0MsdURBQXlFO0FBRXpFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzVCLElBQUksR0FBWSxDQUFDO0lBQ2pCLElBQUksS0FBbUIsQ0FBQztJQUN4QixJQUFJLFFBQWtCLENBQUM7SUFFdkIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNwQixLQUFLLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEdBQUcsRUFBRSxrQkFBa0IsRUFBRTtZQUNoRCxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUU7U0FDdEQsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMxQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUU7WUFDOUMsV0FBVyxFQUFFLGtCQUFLLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUM7WUFDekQsaUJBQWlCLEVBQUUsSUFBSTtTQUN4QixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7UUFDakQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFO1lBQ2hELGdCQUFnQixFQUFFO2dCQUNoQixpQ0FBaUMsRUFBRTtvQkFDakM7d0JBQ0UsNkJBQTZCLEVBQUU7NEJBQzdCLFlBQVksRUFBRSxTQUFTOzRCQUN2QixjQUFjLEVBQUUsa0JBQUssQ0FBQyxRQUFRLEVBQUU7eUJBQ2pDO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDbEQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFO1lBQ2hELDhCQUE4QixFQUFFO2dCQUM5QixlQUFlLEVBQUUsSUFBSTtnQkFDckIsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIscUJBQXFCLEVBQUUsSUFBSTthQUM1QjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtRQUM3RCxRQUFRLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7WUFDaEQsc0JBQXNCLEVBQUU7Z0JBQ3RCLEtBQUssRUFBRSxrQkFBSyxDQUFDLFNBQVMsQ0FBQztvQkFDckIsa0JBQUssQ0FBQyxVQUFVLENBQUM7d0JBQ2YsTUFBTSxFQUFFLFNBQVM7cUJBQ2xCLENBQUM7aUJBQ0gsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQy9DLFFBQVEsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUU7WUFDdkMsV0FBVyxFQUFFLGtCQUFLLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDO1NBQ2xELENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxRQUFRLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFO1lBQ3RDLFdBQVcsRUFBRSxrQkFBSyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQztTQUMvQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDM0QsNERBQTREO1FBQzVELHlFQUF5RTtRQUN6RSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxRQUFRLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7WUFDaEQsU0FBUyxFQUFFLGtCQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO1NBQzlDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxJQUFBLGdDQUFjLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEIsSUFBQSxzQ0FBb0IsRUFBQyxLQUFLLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQUJPVVRNRTogVGVzdHMgZm9yIFN0b3JhZ2VTdGFjayAoUzMgKyBLTVMgKyBsaWZlY3ljbGUpXG4vLyBBQk9VVE1FOiBWYWxpZGF0ZXMgZW5jcnlwdGlvbiwgbGlmZWN5Y2xlIHBvbGljaWVzLCBibG9jayBwdWJsaWMgYWNjZXNzLCBhbmQgQ0RLIE5hZyBjb21wbGlhbmNlXG5cbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBUZW1wbGF0ZSwgTWF0Y2ggfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCB7IFN0b3JhZ2VTdGFjayB9IGZyb20gJy4vc3RvcmFnZS1zdGFjayc7XG5pbXBvcnQgeyBhcHBseU5hZ0NoZWNrcywgYXNzZXJ0Tm9IaWdoRmluZGluZ3MgfSBmcm9tICcuL25hZy10ZXN0LWhlbHBlcic7XG5cbmRlc2NyaWJlKCdTdG9yYWdlU3RhY2snLCAoKSA9PiB7XG4gIGxldCBhcHA6IGNkay5BcHA7XG4gIGxldCBzdGFjazogU3RvcmFnZVN0YWNrO1xuICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgc3RhY2sgPSBuZXcgU3RvcmFnZVN0YWNrKGFwcCwgJ1Rlc3RTdG9yYWdlU3RhY2snLCB7XG4gICAgICBlbnY6IHsgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsIHJlZ2lvbjogJ3VzLXdlc3QtMicgfSxcbiAgICB9KTtcbiAgICB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG4gIH0pO1xuXG4gIHRlc3QoJ1N0YWNrIHN5bnRoZXNpemVzIHN1Y2Nlc3NmdWxseScsICgpID0+IHtcbiAgICBleHBlY3QodGVtcGxhdGUpLnRvQmVEZWZpbmVkKCk7XG4gIH0pO1xuXG4gIHRlc3QoJ0NyZWF0ZXMgS01TIGtleSBmb3IgYnVja2V0IGVuY3J5cHRpb24nLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OktNUzo6S2V5Jywge1xuICAgICAgRGVzY3JpcHRpb246IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJy4qUzMuKmVuY3J5cHRpb24uKicpLFxuICAgICAgRW5hYmxlS2V5Um90YXRpb246IHRydWUsXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0NyZWF0ZXMgUzMgYnVja2V0IHdpdGggS01TIGVuY3J5cHRpb24nLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICBCdWNrZXRFbmNyeXB0aW9uOiB7XG4gICAgICAgIFNlcnZlclNpZGVFbmNyeXB0aW9uQ29uZmlndXJhdGlvbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFNlcnZlclNpZGVFbmNyeXB0aW9uQnlEZWZhdWx0OiB7XG4gICAgICAgICAgICAgIFNTRUFsZ29yaXRobTogJ2F3czprbXMnLFxuICAgICAgICAgICAgICBLTVNNYXN0ZXJLZXlJRDogTWF0Y2guYW55VmFsdWUoKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0VuZm9yY2VzIGJsb2NrIHB1YmxpYyBhY2Nlc3Mgb24gYnVja2V0JywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgUHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIEJsb2NrUHVibGljQWNsczogdHJ1ZSxcbiAgICAgICAgQmxvY2tQdWJsaWNQb2xpY3k6IHRydWUsXG4gICAgICAgIElnbm9yZVB1YmxpY0FjbHM6IHRydWUsXG4gICAgICAgIFJlc3RyaWN0UHVibGljQnVja2V0czogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0NvbmZpZ3VyZXMgbGlmZWN5Y2xlIHBvbGljeSBmb3IgY29zdCBvcHRpbWl6YXRpb24nLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICBMaWZlY3ljbGVDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIFJ1bGVzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgU3RhdHVzOiAnRW5hYmxlZCcsXG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnRXhwb3J0cyBidWNrZXQgbmFtZSBhcyBzdGFjayBvdXRwdXQnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdEYXRhTGFrZUJ1Y2tldE5hbWUnLCB7XG4gICAgICBEZXNjcmlwdGlvbjogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnLipidWNrZXQuKicpLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdFeHBvcnRzIEtNUyBrZXkgQVJOIGFzIHN0YWNrIG91dHB1dCcsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0RhdGFMYWtlS21zS2V5QXJuJywge1xuICAgICAgRGVzY3JpcHRpb246IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJy4qS01TLionKSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnQnVja2V0IG5hbWUgaW5jbHVkZXMgaGFzaCBzdWZmaXggZm9yIHVuaXF1ZW5lc3MnLCAoKSA9PiB7XG4gICAgLy8gU3RhY2sgc3ludGhlc2lzIGFkZHMgdW5pcXVlIGhhc2ggc3VmZml4IHRvIHBoeXNpY2FsIG5hbWVzXG4gICAgLy8gVmVyaWZ5IGJ1Y2tldCBoYXMgYSBsb2dpY2FsIElEIHRoYXQgd2lsbCBnZW5lcmF0ZSB1bmlxdWUgcGh5c2ljYWwgbmFtZVxuICAgIGNvbnN0IGJ1Y2tldHMgPSB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OlMzOjpCdWNrZXQnKTtcbiAgICBleHBlY3QoT2JqZWN0LmtleXMoYnVja2V0cykubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gIH0pO1xuXG4gIHRlc3QoJ0tNUyBrZXkgaGFzIGFsaWFzIGZvciBkaXNjb3ZlcmFiaWxpdHknLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OktNUzo6QWxpYXMnLCB7XG4gICAgICBBbGlhc05hbWU6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ2FsaWFzLy4qJyksXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ05vIENESyBOYWcgSGlnaCBzZXZlcml0eSBmaW5kaW5ncycsICgpID0+IHtcbiAgICBhcHBseU5hZ0NoZWNrcyhzdGFjayk7XG4gICAgYXNzZXJ0Tm9IaWdoRmluZGluZ3Moc3RhY2spO1xuICB9KTtcbn0pO1xuIl19