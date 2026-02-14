"use strict";
// ABOUTME: Tests for NetworkStack (VPC endpoints & security groups)
// ABOUTME: Validates feature-flagged VPC endpoint creation and security group rules for Pipes
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
const network_stack_1 = require("./network-stack");
const nag_test_helper_1 = require("./nag-test-helper");
describe('NetworkStack', () => {
    let app;
    beforeEach(() => {
        app = new cdk.App();
    });
    describe('with FEATURE_PRIVATE_PIPE=false (default)', () => {
        let stack;
        let template;
        beforeEach(() => {
            stack = new network_stack_1.NetworkStack(app, 'TestNetworkStack', {
                env: { account: '123456789012', region: 'us-west-2' },
                vpcId: 'vpc-12345', // Use VPC ID lookup in tests
                mskSecurityGroupId: 'sg-msk-12345',
                enablePrivatePipe: false,
            });
            template = assertions_1.Template.fromStack(stack);
        });
        test('Stack synthesizes successfully', () => {
            expect(template).toBeDefined();
        });
        test('Does not create VPC endpoint when feature flag is false', () => {
            template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
        });
        test('Creates Pipe security group', () => {
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: assertions_1.Match.stringLikeRegexp('.*Pipe.*'),
            });
        });
        test('Pipe security group allows egress to MSK on port 9094', () => {
            template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
                IpProtocol: 'tcp',
                FromPort: 9094,
                ToPort: 9094,
                Description: assertions_1.Match.stringLikeRegexp('.*MSK.*'),
            });
        });
        test('Pipe security group created with explicit egress rules', () => {
            // Verify security group exists
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: assertions_1.Match.stringLikeRegexp('.*Pipe.*'),
            });
            // At least one egress rule should exist (for MSK on port 9094)
            const egressRules = template.findResources('AWS::EC2::SecurityGroupEgress');
            expect(Object.keys(egressRules).length).toBeGreaterThan(0);
        });
        test('MSK security group allows ingress from Pipe SG on port 9094', () => {
            template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
                IpProtocol: 'tcp',
                FromPort: 9094,
                ToPort: 9094,
                Description: assertions_1.Match.stringLikeRegexp('.*Pipe.*'),
            });
        });
        test('Exports Pipe security group ID', () => {
            template.hasOutput('PipeSecurityGroupId', {
                Description: assertions_1.Match.stringLikeRegexp('.*[Ss]ecurity group.*'),
            });
        });
    });
    describe('with FEATURE_PRIVATE_PIPE=true', () => {
        let stack;
        let template;
        beforeEach(() => {
            stack = new network_stack_1.NetworkStack(app, 'TestNetworkStackPrivate', {
                env: { account: '123456789012', region: 'us-west-2' },
                vpcId: 'vpc-67890',
                mskSecurityGroupId: 'sg-msk-67890',
                enablePrivatePipe: true,
            });
            template = assertions_1.Template.fromStack(stack);
        });
        test('Creates VPC endpoint for pipes-data service', () => {
            template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
                ServiceName: assertions_1.Match.stringLikeRegexp('com\\.amazonaws\\..*\\.pipes-data'),
                VpcEndpointType: 'Interface',
            });
        });
        test('VPC endpoint is associated with Pipe security group', () => {
            const resources = template.findResources('AWS::EC2::VPCEndpoint');
            const endpoint = Object.values(resources)[0];
            expect(endpoint.Properties.SecurityGroupIds).toBeDefined();
            expect(Array.isArray(endpoint.Properties.SecurityGroupIds)).toBe(true);
            expect(endpoint.Properties.SecurityGroupIds.length).toBeGreaterThan(0);
        });
        test('VPC endpoint is placed in private subnets', () => {
            const resources = template.findResources('AWS::EC2::VPCEndpoint');
            const endpoint = Object.values(resources)[0];
            expect(endpoint.Properties.SubnetIds).toBeDefined();
            expect(Array.isArray(endpoint.Properties.SubnetIds)).toBe(true);
            expect(endpoint.Properties.SubnetIds.length).toBeGreaterThan(0);
        });
        test('Exports VPC endpoint ID when enabled', () => {
            template.hasOutput('PipeVpcEndpointId', {
                Description: assertions_1.Match.stringLikeRegexp('.*VPC endpoint.*'),
            });
        });
    });
    describe('CDK Nag compliance', () => {
        test('No High severity findings without VPC endpoint', () => {
            const stack = new network_stack_1.NetworkStack(app, 'TestNetworkStackNag1', {
                env: { account: '123456789012', region: 'us-west-2' },
                vpcId: 'vpc-nag1',
                mskSecurityGroupId: 'sg-msk-nag1',
                enablePrivatePipe: false,
            });
            (0, nag_test_helper_1.applyNagChecks)(stack);
            (0, nag_test_helper_1.assertNoHighFindings)(stack);
        });
        test('No High severity findings with VPC endpoint', () => {
            const stack = new network_stack_1.NetworkStack(app, 'TestNetworkStackNag2', {
                env: { account: '123456789012', region: 'us-west-2' },
                vpcId: 'vpc-nag2',
                mskSecurityGroupId: 'sg-msk-nag2',
                enablePrivatePipe: true,
            });
            (0, nag_test_helper_1.applyNagChecks)(stack);
            (0, nag_test_helper_1.assertNoHighFindings)(stack);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay1zdGFjay50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vaW5mcmEvbGliL25ldHdvcmstc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQW9FO0FBQ3BFLDhGQUE4Rjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFOUYsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUV6RCxtREFBK0M7QUFDL0MsdURBQXlFO0FBRXpFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzVCLElBQUksR0FBWSxDQUFDO0lBRWpCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ3pELElBQUksS0FBbUIsQ0FBQztRQUN4QixJQUFJLFFBQWtCLENBQUM7UUFFdkIsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNkLEtBQUssR0FBRyxJQUFJLDRCQUFZLENBQUMsR0FBRyxFQUFFLGtCQUFrQixFQUFFO2dCQUNoRCxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUU7Z0JBQ3JELEtBQUssRUFBRSxXQUFXLEVBQUUsNkJBQTZCO2dCQUNqRCxrQkFBa0IsRUFBRSxjQUFjO2dCQUNsQyxpQkFBaUIsRUFBRSxLQUFLO2FBQ3pCLENBQUMsQ0FBQztZQUVILFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7WUFDMUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFB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TCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQUJPVVRNRTogVGVzdHMgZm9yIE5ldHdvcmtTdGFjayAoVlBDIGVuZHBvaW50cyAmIHNlY3VyaXR5IGdyb3Vwcylcbi8vIEFCT1VUTUU6IFZhbGlkYXRlcyBmZWF0dXJlLWZsYWdnZWQgVlBDIGVuZHBvaW50IGNyZWF0aW9uIGFuZCBzZWN1cml0eSBncm91cCBydWxlcyBmb3IgUGlwZXNcblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlLCBNYXRjaCB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHsgTmV0d29ya1N0YWNrIH0gZnJvbSAnLi9uZXR3b3JrLXN0YWNrJztcbmltcG9ydCB7IGFwcGx5TmFnQ2hlY2tzLCBhc3NlcnROb0hpZ2hGaW5kaW5ncyB9IGZyb20gJy4vbmFnLXRlc3QtaGVscGVyJztcblxuZGVzY3JpYmUoJ05ldHdvcmtTdGFjaycsICgpID0+IHtcbiAgbGV0IGFwcDogY2RrLkFwcDtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICB9KTtcblxuICBkZXNjcmliZSgnd2l0aCBGRUFUVVJFX1BSSVZBVEVfUElQRT1mYWxzZSAoZGVmYXVsdCknLCAoKSA9PiB7XG4gICAgbGV0IHN0YWNrOiBOZXR3b3JrU3RhY2s7XG4gICAgbGV0IHRlbXBsYXRlOiBUZW1wbGF0ZTtcblxuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc3RhY2sgPSBuZXcgTmV0d29ya1N0YWNrKGFwcCwgJ1Rlc3ROZXR3b3JrU3RhY2snLCB7XG4gICAgICAgIGVudjogeyBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJywgcmVnaW9uOiAndXMtd2VzdC0yJyB9LFxuICAgICAgICB2cGNJZDogJ3ZwYy0xMjM0NScsIC8vIFVzZSBWUEMgSUQgbG9va3VwIGluIHRlc3RzXG4gICAgICAgIG1za1NlY3VyaXR5R3JvdXBJZDogJ3NnLW1zay0xMjM0NScsXG4gICAgICAgIGVuYWJsZVByaXZhdGVQaXBlOiBmYWxzZSxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdTdGFjayBzeW50aGVzaXplcyBzdWNjZXNzZnVsbHknLCAoKSA9PiB7XG4gICAgICBleHBlY3QodGVtcGxhdGUpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdEb2VzIG5vdCBjcmVhdGUgVlBDIGVuZHBvaW50IHdoZW4gZmVhdHVyZSBmbGFnIGlzIGZhbHNlJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkVDMjo6VlBDRW5kcG9pbnQnLCAwKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ0NyZWF0ZXMgUGlwZSBzZWN1cml0eSBncm91cCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIEdyb3VwRGVzY3JpcHRpb246IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJy4qUGlwZS4qJyksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ1BpcGUgc2VjdXJpdHkgZ3JvdXAgYWxsb3dzIGVncmVzcyB0byBNU0sgb24gcG9ydCA5MDk0JywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cEVncmVzcycsIHtcbiAgICAgICAgSXBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgIEZyb21Qb3J0OiA5MDk0LFxuICAgICAgICBUb1BvcnQ6IDkwOTQsXG4gICAgICAgIERlc2NyaXB0aW9uOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCcuKk1TSy4qJyksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ1BpcGUgc2VjdXJpdHkgZ3JvdXAgY3JlYXRlZCB3aXRoIGV4cGxpY2l0IGVncmVzcyBydWxlcycsICgpID0+IHtcbiAgICAgIC8vIFZlcmlmeSBzZWN1cml0eSBncm91cCBleGlzdHNcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIEdyb3VwRGVzY3JpcHRpb246IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJy4qUGlwZS4qJyksXG4gICAgICB9KTtcblxuICAgICAgLy8gQXQgbGVhc3Qgb25lIGVncmVzcyBydWxlIHNob3VsZCBleGlzdCAoZm9yIE1TSyBvbiBwb3J0IDkwOTQpXG4gICAgICBjb25zdCBlZ3Jlc3NSdWxlcyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwRWdyZXNzJyk7XG4gICAgICBleHBlY3QoT2JqZWN0LmtleXMoZWdyZXNzUnVsZXMpLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnTVNLIHNlY3VyaXR5IGdyb3VwIGFsbG93cyBpbmdyZXNzIGZyb20gUGlwZSBTRyBvbiBwb3J0IDkwOTQnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwSW5ncmVzcycsIHtcbiAgICAgICAgSXBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgIEZyb21Qb3J0OiA5MDk0LFxuICAgICAgICBUb1BvcnQ6IDkwOTQsXG4gICAgICAgIERlc2NyaXB0aW9uOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCcuKlBpcGUuKicpLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdFeHBvcnRzIFBpcGUgc2VjdXJpdHkgZ3JvdXAgSUQnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ1BpcGVTZWN1cml0eUdyb3VwSWQnLCB7XG4gICAgICAgIERlc2NyaXB0aW9uOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCcuKltTc11lY3VyaXR5IGdyb3VwLionKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnd2l0aCBGRUFUVVJFX1BSSVZBVEVfUElQRT10cnVlJywgKCkgPT4ge1xuICAgIGxldCBzdGFjazogTmV0d29ya1N0YWNrO1xuICAgIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG5cbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHN0YWNrID0gbmV3IE5ldHdvcmtTdGFjayhhcHAsICdUZXN0TmV0d29ya1N0YWNrUHJpdmF0ZScsIHtcbiAgICAgICAgZW52OiB7IGFjY291bnQ6ICcxMjM0NTY3ODkwMTInLCByZWdpb246ICd1cy13ZXN0LTInIH0sXG4gICAgICAgIHZwY0lkOiAndnBjLTY3ODkwJyxcbiAgICAgICAgbXNrU2VjdXJpdHlHcm91cElkOiAnc2ctbXNrLTY3ODkwJyxcbiAgICAgICAgZW5hYmxlUHJpdmF0ZVBpcGU6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnQ3JlYXRlcyBWUEMgZW5kcG9pbnQgZm9yIHBpcGVzLWRhdGEgc2VydmljZScsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlZQQ0VuZHBvaW50Jywge1xuICAgICAgICBTZXJ2aWNlTmFtZTogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnY29tXFxcXC5hbWF6b25hd3NcXFxcLi4qXFxcXC5waXBlcy1kYXRhJyksXG4gICAgICAgIFZwY0VuZHBvaW50VHlwZTogJ0ludGVyZmFjZScsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ1ZQQyBlbmRwb2ludCBpcyBhc3NvY2lhdGVkIHdpdGggUGlwZSBzZWN1cml0eSBncm91cCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc291cmNlcyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6RUMyOjpWUENFbmRwb2ludCcpO1xuICAgICAgY29uc3QgZW5kcG9pbnQgPSBPYmplY3QudmFsdWVzKHJlc291cmNlcylbMF07XG5cbiAgICAgIGV4cGVjdChlbmRwb2ludC5Qcm9wZXJ0aWVzLlNlY3VyaXR5R3JvdXBJZHMpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShlbmRwb2ludC5Qcm9wZXJ0aWVzLlNlY3VyaXR5R3JvdXBJZHMpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGVuZHBvaW50LlByb3BlcnRpZXMuU2VjdXJpdHlHcm91cElkcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ1ZQQyBlbmRwb2ludCBpcyBwbGFjZWQgaW4gcHJpdmF0ZSBzdWJuZXRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzb3VyY2VzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpFQzI6OlZQQ0VuZHBvaW50Jyk7XG4gICAgICBjb25zdCBlbmRwb2ludCA9IE9iamVjdC52YWx1ZXMocmVzb3VyY2VzKVswXTtcblxuICAgICAgZXhwZWN0KGVuZHBvaW50LlByb3BlcnRpZXMuU3VibmV0SWRzKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KEFycmF5LmlzQXJyYXkoZW5kcG9pbnQuUHJvcGVydGllcy5TdWJuZXRJZHMpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGVuZHBvaW50LlByb3BlcnRpZXMuU3VibmV0SWRzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnRXhwb3J0cyBWUEMgZW5kcG9pbnQgSUQgd2hlbiBlbmFibGVkJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdQaXBlVnBjRW5kcG9pbnRJZCcsIHtcbiAgICAgICAgRGVzY3JpcHRpb246IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJy4qVlBDIGVuZHBvaW50LionKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ0RLIE5hZyBjb21wbGlhbmNlJywgKCkgPT4ge1xuICAgIHRlc3QoJ05vIEhpZ2ggc2V2ZXJpdHkgZmluZGluZ3Mgd2l0aG91dCBWUEMgZW5kcG9pbnQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBzdGFjayA9IG5ldyBOZXR3b3JrU3RhY2soYXBwLCAnVGVzdE5ldHdvcmtTdGFja05hZzEnLCB7XG4gICAgICAgIGVudjogeyBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJywgcmVnaW9uOiAndXMtd2VzdC0yJyB9LFxuICAgICAgICB2cGNJZDogJ3ZwYy1uYWcxJyxcbiAgICAgICAgbXNrU2VjdXJpdHlHcm91cElkOiAnc2ctbXNrLW5hZzEnLFxuICAgICAgICBlbmFibGVQcml2YXRlUGlwZTogZmFsc2UsXG4gICAgICB9KTtcblxuICAgICAgYXBwbHlOYWdDaGVja3Moc3RhY2spO1xuICAgICAgYXNzZXJ0Tm9IaWdoRmluZGluZ3Moc3RhY2spO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnTm8gSGlnaCBzZXZlcml0eSBmaW5kaW5ncyB3aXRoIFZQQyBlbmRwb2ludCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0YWNrID0gbmV3IE5ldHdvcmtTdGFjayhhcHAsICdUZXN0TmV0d29ya1N0YWNrTmFnMicsIHtcbiAgICAgICAgZW52OiB7IGFjY291bnQ6ICcxMjM0NTY3ODkwMTInLCByZWdpb246ICd1cy13ZXN0LTInIH0sXG4gICAgICAgIHZwY0lkOiAndnBjLW5hZzInLFxuICAgICAgICBtc2tTZWN1cml0eUdyb3VwSWQ6ICdzZy1tc2stbmFnMicsXG4gICAgICAgIGVuYWJsZVByaXZhdGVQaXBlOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIGFwcGx5TmFnQ2hlY2tzKHN0YWNrKTtcbiAgICAgIGFzc2VydE5vSGlnaEZpbmRpbmdzKHN0YWNrKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==