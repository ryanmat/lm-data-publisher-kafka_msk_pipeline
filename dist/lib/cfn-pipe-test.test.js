"use strict";
// ABOUTME: Verification test for CfnPipe availability
// ABOUTME: Confirms aws-cdk-lib includes EventBridge Pipes L1 constructs
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
const pipes = __importStar(require("aws-cdk-lib/aws-pipes"));
describe('CfnPipe Availability', () => {
    test('CfnPipe is available from aws-cdk-lib', () => {
        // Verify CfnPipe class exists
        expect(pipes.CfnPipe).toBeDefined();
        expect(typeof pipes.CfnPipe).toBe('function');
    });
    test('Can instantiate CfnPipe construct', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        // Create a minimal CfnPipe (will fail validation but proves it's available)
        const pipe = new pipes.CfnPipe(stack, 'TestPipe', {
            roleArn: 'arn:aws:iam::123456789012:role/test-role',
            source: 'arn:aws:kafka:us-west-2:123456789012:cluster/test/abc',
            target: 'arn:aws:lambda:us-west-2:123456789012:function:test',
        });
        expect(pipe).toBeDefined();
        expect(pipe.roleArn).toBe('arn:aws:iam::123456789012:role/test-role');
    });
    test('CfnPipe supports MSK source configuration', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const pipe = new pipes.CfnPipe(stack, 'TestPipe', {
            roleArn: 'arn:aws:iam::123456789012:role/test-role',
            source: 'arn:aws:kafka:us-west-2:123456789012:cluster/test/abc',
            target: 'arn:aws:lambda:us-west-2:123456789012:function:test',
            sourceParameters: {
                managedStreamingKafkaParameters: {
                    topicName: 'lm.metrics.otlp',
                    startingPosition: 'TRIM_HORIZON',
                    batchSize: 100,
                },
            },
        });
        expect(pipe.sourceParameters).toBeDefined();
    });
    test('CfnPipe supports Lambda target configuration', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const pipe = new pipes.CfnPipe(stack, 'TestPipe', {
            roleArn: 'arn:aws:iam::123456789012:role/test-role',
            source: 'arn:aws:kafka:us-west-2:123456789012:cluster/test/abc',
            target: 'arn:aws:lambda:us-west-2:123456789012:function:test',
            targetParameters: {
                lambdaFunctionParameters: {
                    invocationType: 'REQUEST_RESPONSE',
                },
            },
        });
        expect(pipe.targetParameters).toBeDefined();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2ZuLXBpcGUtdGVzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vaW5mcmEvbGliL2Nmbi1waXBlLXRlc3QudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsc0RBQXNEO0FBQ3RELHlFQUF5RTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFekUsaURBQW1DO0FBQ25DLDZEQUErQztBQUUvQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7UUFDakQsOEJBQThCO1FBQzlCLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDcEMsTUFBTSxDQUFDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDN0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUU5Qyw0RUFBNEU7UUFDNUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUU7WUFDaEQsT0FBTyxFQUFFLDBDQUEwQztZQUNuRCxNQUFNLEVBQUUsdURBQXVEO1lBQy9ELE1BQU0sRUFBRSxxREFBcUQ7U0FDOUQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLENBQUM7SUFDeEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFOUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUU7WUFDaEQsT0FBTyxFQUFFLDBDQUEwQztZQUNuRCxNQUFNLEVBQUUsdURBQXVEO1lBQy9ELE1BQU0sRUFBRSxxREFBcUQ7WUFDN0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLCtCQUErQixFQUFFO29CQUMvQixTQUFTLEVBQUUsaUJBQWlCO29CQUM1QixnQkFBZ0IsRUFBRSxjQUFjO29CQUNoQyxTQUFTLEVBQUUsR0FBRztpQkFDZjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTlDLE1BQU0sSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFO1lBQ2hELE9BQU8sRUFBRSwwQ0FBMEM7WUFDbkQsTUFBTSxFQUFFLHVEQUF1RDtZQUMvRCxNQUFNLEVBQUUscURBQXFEO1lBQzdELGdCQUFnQixFQUFFO2dCQUNoQix3QkFBd0IsRUFBRTtvQkFDeEIsY0FBYyxFQUFFLGtCQUFrQjtpQkFDbkM7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUM5QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQUJPVVRNRTogVmVyaWZpY2F0aW9uIHRlc3QgZm9yIENmblBpcGUgYXZhaWxhYmlsaXR5XG4vLyBBQk9VVE1FOiBDb25maXJtcyBhd3MtY2RrLWxpYiBpbmNsdWRlcyBFdmVudEJyaWRnZSBQaXBlcyBMMSBjb25zdHJ1Y3RzXG5cbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBwaXBlcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcGlwZXMnO1xuXG5kZXNjcmliZSgnQ2ZuUGlwZSBBdmFpbGFiaWxpdHknLCAoKSA9PiB7XG4gIHRlc3QoJ0NmblBpcGUgaXMgYXZhaWxhYmxlIGZyb20gYXdzLWNkay1saWInLCAoKSA9PiB7XG4gICAgLy8gVmVyaWZ5IENmblBpcGUgY2xhc3MgZXhpc3RzXG4gICAgZXhwZWN0KHBpcGVzLkNmblBpcGUpLnRvQmVEZWZpbmVkKCk7XG4gICAgZXhwZWN0KHR5cGVvZiBwaXBlcy5DZm5QaXBlKS50b0JlKCdmdW5jdGlvbicpO1xuICB9KTtcblxuICB0ZXN0KCdDYW4gaW5zdGFudGlhdGUgQ2ZuUGlwZSBjb25zdHJ1Y3QnLCAoKSA9PiB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soYXBwLCAnVGVzdFN0YWNrJyk7XG5cbiAgICAvLyBDcmVhdGUgYSBtaW5pbWFsIENmblBpcGUgKHdpbGwgZmFpbCB2YWxpZGF0aW9uIGJ1dCBwcm92ZXMgaXQncyBhdmFpbGFibGUpXG4gICAgY29uc3QgcGlwZSA9IG5ldyBwaXBlcy5DZm5QaXBlKHN0YWNrLCAnVGVzdFBpcGUnLCB7XG4gICAgICByb2xlQXJuOiAnYXJuOmF3czppYW06OjEyMzQ1Njc4OTAxMjpyb2xlL3Rlc3Qtcm9sZScsXG4gICAgICBzb3VyY2U6ICdhcm46YXdzOmthZmthOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6Y2x1c3Rlci90ZXN0L2FiYycsXG4gICAgICB0YXJnZXQ6ICdhcm46YXdzOmxhbWJkYTp1cy13ZXN0LTI6MTIzNDU2Nzg5MDEyOmZ1bmN0aW9uOnRlc3QnLFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHBpcGUpLnRvQmVEZWZpbmVkKCk7XG4gICAgZXhwZWN0KHBpcGUucm9sZUFybikudG9CZSgnYXJuOmF3czppYW06OjEyMzQ1Njc4OTAxMjpyb2xlL3Rlc3Qtcm9sZScpO1xuICB9KTtcblxuICB0ZXN0KCdDZm5QaXBlIHN1cHBvcnRzIE1TSyBzb3VyY2UgY29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjayhhcHAsICdUZXN0U3RhY2snKTtcblxuICAgIGNvbnN0IHBpcGUgPSBuZXcgcGlwZXMuQ2ZuUGlwZShzdGFjaywgJ1Rlc3RQaXBlJywge1xuICAgICAgcm9sZUFybjogJ2Fybjphd3M6aWFtOjoxMjM0NTY3ODkwMTI6cm9sZS90ZXN0LXJvbGUnLFxuICAgICAgc291cmNlOiAnYXJuOmF3czprYWZrYTp1cy13ZXN0LTI6MTIzNDU2Nzg5MDEyOmNsdXN0ZXIvdGVzdC9hYmMnLFxuICAgICAgdGFyZ2V0OiAnYXJuOmF3czpsYW1iZGE6dXMtd2VzdC0yOjEyMzQ1Njc4OTAxMjpmdW5jdGlvbjp0ZXN0JyxcbiAgICAgIHNvdXJjZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgbWFuYWdlZFN0cmVhbWluZ0thZmthUGFyYW1ldGVyczoge1xuICAgICAgICAgIHRvcGljTmFtZTogJ2xtLm1ldHJpY3Mub3RscCcsXG4gICAgICAgICAgc3RhcnRpbmdQb3NpdGlvbjogJ1RSSU1fSE9SSVpPTicsXG4gICAgICAgICAgYmF0Y2hTaXplOiAxMDAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHBpcGUuc291cmNlUGFyYW1ldGVycykudG9CZURlZmluZWQoKTtcbiAgfSk7XG5cbiAgdGVzdCgnQ2ZuUGlwZSBzdXBwb3J0cyBMYW1iZGEgdGFyZ2V0IGNvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soYXBwLCAnVGVzdFN0YWNrJyk7XG5cbiAgICBjb25zdCBwaXBlID0gbmV3IHBpcGVzLkNmblBpcGUoc3RhY2ssICdUZXN0UGlwZScsIHtcbiAgICAgIHJvbGVBcm46ICdhcm46YXdzOmlhbTo6MTIzNDU2Nzg5MDEyOnJvbGUvdGVzdC1yb2xlJyxcbiAgICAgIHNvdXJjZTogJ2Fybjphd3M6a2Fma2E6dXMtd2VzdC0yOjEyMzQ1Njc4OTAxMjpjbHVzdGVyL3Rlc3QvYWJjJyxcbiAgICAgIHRhcmdldDogJ2Fybjphd3M6bGFtYmRhOnVzLXdlc3QtMjoxMjM0NTY3ODkwMTI6ZnVuY3Rpb246dGVzdCcsXG4gICAgICB0YXJnZXRQYXJhbWV0ZXJzOiB7XG4gICAgICAgIGxhbWJkYUZ1bmN0aW9uUGFyYW1ldGVyczoge1xuICAgICAgICAgIGludm9jYXRpb25UeXBlOiAnUkVRVUVTVF9SRVNQT05TRScsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHBpcGUudGFyZ2V0UGFyYW1ldGVycykudG9CZURlZmluZWQoKTtcbiAgfSk7XG59KTtcbiJdfQ==