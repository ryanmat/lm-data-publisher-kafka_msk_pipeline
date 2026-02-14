"use strict";
// ABOUTME: NetworkStack creates VPC endpoints and security groups for Pipes connectivity
// ABOUTME: Supports feature-flagged private endpoint and security rules for MSK access
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
exports.NetworkStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
class NetworkStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { vpc: vpcProp, vpcId, mskSecurityGroupId, enablePrivatePipe = false } = props;
        // Use provided VPC or import by ID
        const vpc = vpcProp || (vpcId ? ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
            vpcId,
            vpcCidrBlock: '10.0.0.0/16',
            availabilityZones: ['us-west-2a', 'us-west-2b'],
            privateSubnetIds: ['subnet-private-1', 'subnet-private-2'],
            publicSubnetIds: ['subnet-public-1', 'subnet-public-2'],
            isolatedSubnetIds: ['subnet-isolated-1', 'subnet-isolated-2'],
        }) : (() => {
            throw new Error('Either vpc or vpcId must be provided');
        })());
        this.vpc = vpc;
        // Import the MSK security group
        const mskSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'MskSecurityGroup', mskSecurityGroupId);
        // Create security group for EventBridge Pipe
        this.pipeSecurityGroup = new ec2.SecurityGroup(this, 'PipeSecurityGroup', {
            vpc,
            description: 'Security group for EventBridge Pipe to access MSK and AWS services',
            allowAllOutbound: false,
        });
        // Allow Pipe to connect to MSK on port 9094 (TLS)
        this.pipeSecurityGroup.addEgressRule(mskSecurityGroup, ec2.Port.tcp(9094), 'Allow Pipe to connect to MSK via TLS (port 9094)');
        // Allow Pipe to connect to AWS services via HTTPS
        this.pipeSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow Pipe to connect to AWS services via HTTPS');
        // Allow MSK to accept connections from Pipe on port 9094
        mskSecurityGroup.addIngressRule(this.pipeSecurityGroup, ec2.Port.tcp(9094), 'Allow Pipe to connect to MSK brokers on port 9094');
        // Conditionally create VPC endpoint for Pipes (feature-flagged)
        if (enablePrivatePipe) {
            this.vpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'PipeVpcEndpoint', {
                vpc,
                service: new ec2.InterfaceVpcEndpointService(`com.amazonaws.${this.region}.pipes-data`, 443),
                securityGroups: [this.pipeSecurityGroup],
                subnets: {
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
                privateDnsEnabled: true,
            });
            // Export VPC endpoint ID
            new cdk.CfnOutput(this, 'PipeVpcEndpointId', {
                value: this.vpcEndpoint.vpcEndpointId,
                description: 'VPC endpoint ID for EventBridge Pipes',
                exportName: `${this.stackName}-PipeVpcEndpointId`,
            });
        }
        // Export Pipe security group ID
        new cdk.CfnOutput(this, 'PipeSecurityGroupId', {
            value: this.pipeSecurityGroup.securityGroupId,
            description: 'Security group ID for EventBridge Pipe',
            exportName: `${this.stackName}-PipeSecurityGroupId`,
        });
    }
}
exports.NetworkStack = NetworkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2luZnJhL2xpYi9uZXR3b3JrLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx5RkFBeUY7QUFDekYsdUZBQXVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFdkYsaURBQW1DO0FBQ25DLHlEQUEyQztBQVUzQyxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQUt6QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFckYsbUNBQW1DO1FBQ25DLE1BQU0sR0FBRyxHQUFHLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO1lBQ3JFLEtBQUs7WUFDTCxZQUFZLEVBQUUsYUFBYTtZQUMzQixpQkFBaUIsRUFBRSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUM7WUFDL0MsZ0JBQWdCLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztZQUMxRCxlQUFlLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQztZQUN2RCxpQkFBaUIsRUFBRSxDQUFDLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDO1NBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7WUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ04sSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFFZixnQ0FBZ0M7UUFDaEMsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUM1RCxJQUFJLEVBQ0osa0JBQWtCLEVBQ2xCLGtCQUFrQixDQUNuQixDQUFDO1FBRUYsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3hFLEdBQUc7WUFDSCxXQUFXLEVBQUUsb0VBQW9FO1lBQ2pGLGdCQUFnQixFQUFFLEtBQUs7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQ2xDLGdCQUFnQixFQUNoQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDbEIsa0RBQWtELENBQ25ELENBQUM7UUFFRixrREFBa0Q7UUFDbEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FDbEMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQ2pCLGlEQUFpRCxDQUNsRCxDQUFDO1FBRUYseURBQXlEO1FBQ3pELGdCQUFnQixDQUFDLGNBQWMsQ0FDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUN0QixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDbEIsbURBQW1ELENBQ3BELENBQUM7UUFFRixnRUFBZ0U7UUFDaEUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO2dCQUN2RSxHQUFHO2dCQUNILE9BQU8sRUFBRSxJQUFJLEdBQUcsQ0FBQywyQkFBMkIsQ0FDMUMsaUJBQWlCLElBQUksQ0FBQyxNQUFNLGFBQWEsRUFDekMsR0FBRyxDQUNKO2dCQUNELGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztnQkFDeEMsT0FBTyxFQUFFO29CQUNQLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtpQkFDNUM7Z0JBQ0QsaUJBQWlCLEVBQUUsSUFBSTthQUN4QixDQUFDLENBQUM7WUFFSCx5QkFBeUI7WUFDekIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtnQkFDM0MsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYTtnQkFDckMsV0FBVyxFQUFFLHVDQUF1QztnQkFDcEQsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsb0JBQW9CO2FBQ2xELENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWU7WUFDN0MsV0FBVyxFQUFFLHdDQUF3QztZQUNyRCxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxzQkFBc0I7U0FDcEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBeEZELG9DQXdGQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEFCT1VUTUU6IE5ldHdvcmtTdGFjayBjcmVhdGVzIFZQQyBlbmRwb2ludHMgYW5kIHNlY3VyaXR5IGdyb3VwcyBmb3IgUGlwZXMgY29ubmVjdGl2aXR5XG4vLyBBQk9VVE1FOiBTdXBwb3J0cyBmZWF0dXJlLWZsYWdnZWQgcHJpdmF0ZSBlbmRwb2ludCBhbmQgc2VjdXJpdHkgcnVsZXMgZm9yIE1TSyBhY2Nlc3NcblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5ldHdvcmtTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICByZWFkb25seSB2cGM/OiBlYzIuSVZwYztcbiAgcmVhZG9ubHkgdnBjSWQ/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IG1za1NlY3VyaXR5R3JvdXBJZDogc3RyaW5nO1xuICByZWFkb25seSBlbmFibGVQcml2YXRlUGlwZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBOZXR3b3JrU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgcGlwZVNlY3VyaXR5R3JvdXA6IGVjMi5JU2VjdXJpdHlHcm91cDtcbiAgcHVibGljIHJlYWRvbmx5IHZwY0VuZHBvaW50PzogZWMyLklWcGNFbmRwb2ludDtcbiAgcHVibGljIHJlYWRvbmx5IHZwYzogZWMyLklWcGM7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE5ldHdvcmtTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IHZwYzogdnBjUHJvcCwgdnBjSWQsIG1za1NlY3VyaXR5R3JvdXBJZCwgZW5hYmxlUHJpdmF0ZVBpcGUgPSBmYWxzZSB9ID0gcHJvcHM7XG5cbiAgICAvLyBVc2UgcHJvdmlkZWQgVlBDIG9yIGltcG9ydCBieSBJRFxuICAgIGNvbnN0IHZwYyA9IHZwY1Byb3AgfHwgKHZwY0lkID8gZWMyLlZwYy5mcm9tVnBjQXR0cmlidXRlcyh0aGlzLCAnVnBjJywge1xuICAgICAgdnBjSWQsXG4gICAgICB2cGNDaWRyQmxvY2s6ICcxMC4wLjAuMC8xNicsXG4gICAgICBhdmFpbGFiaWxpdHlab25lczogWyd1cy13ZXN0LTJhJywgJ3VzLXdlc3QtMmInXSxcbiAgICAgIHByaXZhdGVTdWJuZXRJZHM6IFsnc3VibmV0LXByaXZhdGUtMScsICdzdWJuZXQtcHJpdmF0ZS0yJ10sXG4gICAgICBwdWJsaWNTdWJuZXRJZHM6IFsnc3VibmV0LXB1YmxpYy0xJywgJ3N1Ym5ldC1wdWJsaWMtMiddLFxuICAgICAgaXNvbGF0ZWRTdWJuZXRJZHM6IFsnc3VibmV0LWlzb2xhdGVkLTEnLCAnc3VibmV0LWlzb2xhdGVkLTInXSxcbiAgICB9KSA6ICgoKSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VpdGhlciB2cGMgb3IgdnBjSWQgbXVzdCBiZSBwcm92aWRlZCcpO1xuICAgIH0pKCkpO1xuICAgIHRoaXMudnBjID0gdnBjO1xuXG4gICAgLy8gSW1wb3J0IHRoZSBNU0sgc2VjdXJpdHkgZ3JvdXBcbiAgICBjb25zdCBtc2tTZWN1cml0eUdyb3VwID0gZWMyLlNlY3VyaXR5R3JvdXAuZnJvbVNlY3VyaXR5R3JvdXBJZChcbiAgICAgIHRoaXMsXG4gICAgICAnTXNrU2VjdXJpdHlHcm91cCcsXG4gICAgICBtc2tTZWN1cml0eUdyb3VwSWRcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIHNlY3VyaXR5IGdyb3VwIGZvciBFdmVudEJyaWRnZSBQaXBlXG4gICAgdGhpcy5waXBlU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnUGlwZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFdmVudEJyaWRnZSBQaXBlIHRvIGFjY2VzcyBNU0sgYW5kIEFXUyBzZXJ2aWNlcycsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIC8vIEFsbG93IFBpcGUgdG8gY29ubmVjdCB0byBNU0sgb24gcG9ydCA5MDk0IChUTFMpXG4gICAgdGhpcy5waXBlU2VjdXJpdHlHcm91cC5hZGRFZ3Jlc3NSdWxlKFxuICAgICAgbXNrU2VjdXJpdHlHcm91cCxcbiAgICAgIGVjMi5Qb3J0LnRjcCg5MDk0KSxcbiAgICAgICdBbGxvdyBQaXBlIHRvIGNvbm5lY3QgdG8gTVNLIHZpYSBUTFMgKHBvcnQgOTA5NCknXG4gICAgKTtcblxuICAgIC8vIEFsbG93IFBpcGUgdG8gY29ubmVjdCB0byBBV1Mgc2VydmljZXMgdmlhIEhUVFBTXG4gICAgdGhpcy5waXBlU2VjdXJpdHlHcm91cC5hZGRFZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgZWMyLlBvcnQudGNwKDQ0MyksXG4gICAgICAnQWxsb3cgUGlwZSB0byBjb25uZWN0IHRvIEFXUyBzZXJ2aWNlcyB2aWEgSFRUUFMnXG4gICAgKTtcblxuICAgIC8vIEFsbG93IE1TSyB0byBhY2NlcHQgY29ubmVjdGlvbnMgZnJvbSBQaXBlIG9uIHBvcnQgOTA5NFxuICAgIG1za1NlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICB0aGlzLnBpcGVTZWN1cml0eUdyb3VwLFxuICAgICAgZWMyLlBvcnQudGNwKDkwOTQpLFxuICAgICAgJ0FsbG93IFBpcGUgdG8gY29ubmVjdCB0byBNU0sgYnJva2VycyBvbiBwb3J0IDkwOTQnXG4gICAgKTtcblxuICAgIC8vIENvbmRpdGlvbmFsbHkgY3JlYXRlIFZQQyBlbmRwb2ludCBmb3IgUGlwZXMgKGZlYXR1cmUtZmxhZ2dlZClcbiAgICBpZiAoZW5hYmxlUHJpdmF0ZVBpcGUpIHtcbiAgICAgIHRoaXMudnBjRW5kcG9pbnQgPSBuZXcgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50KHRoaXMsICdQaXBlVnBjRW5kcG9pbnQnLCB7XG4gICAgICAgIHZwYyxcbiAgICAgICAgc2VydmljZTogbmV3IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludFNlcnZpY2UoXG4gICAgICAgICAgYGNvbS5hbWF6b25hd3MuJHt0aGlzLnJlZ2lvbn0ucGlwZXMtZGF0YWAsXG4gICAgICAgICAgNDQzXG4gICAgICAgICksXG4gICAgICAgIHNlY3VyaXR5R3JvdXBzOiBbdGhpcy5waXBlU2VjdXJpdHlHcm91cF0sXG4gICAgICAgIHN1Ym5ldHM6IHtcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgICB9LFxuICAgICAgICBwcml2YXRlRG5zRW5hYmxlZDogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBFeHBvcnQgVlBDIGVuZHBvaW50IElEXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUGlwZVZwY0VuZHBvaW50SWQnLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLnZwY0VuZHBvaW50LnZwY0VuZHBvaW50SWQsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVlBDIGVuZHBvaW50IElEIGZvciBFdmVudEJyaWRnZSBQaXBlcycsXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1QaXBlVnBjRW5kcG9pbnRJZGAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBFeHBvcnQgUGlwZSBzZWN1cml0eSBncm91cCBJRFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQaXBlU2VjdXJpdHlHcm91cElkJywge1xuICAgICAgdmFsdWU6IHRoaXMucGlwZVNlY3VyaXR5R3JvdXAuc2VjdXJpdHlHcm91cElkLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBJRCBmb3IgRXZlbnRCcmlkZ2UgUGlwZScsXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tUGlwZVNlY3VyaXR5R3JvdXBJZGAsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==