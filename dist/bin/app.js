#!/usr/bin/env node
"use strict";
// ABOUTME: CDK application entry point
// ABOUTME: Initializes and synthesizes all infrastructure stacks
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const base_stack_1 = require("../lib/base-stack");
const storage_stack_1 = require("../lib/storage-stack");
const delivery_stack_1 = require("../lib/delivery-stack");
const app = new cdk.App();
const stackEnv = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
};
const stackTags = {
    Project: 'lm-datapublisher',
    Environment: 'demo',
    ManagedBy: 'cdk',
};
new base_stack_1.BaseStack(app, 'LMDataPublisherBaseStack', {
    env: stackEnv,
    tags: stackTags,
});
const storageStack = new storage_stack_1.StorageStack(app, 'LMDataPublisherStorageStack', {
    env: stackEnv,
    tags: stackTags,
});
new delivery_stack_1.DeliveryStack(app, 'LMDataPublisherDeliveryStack', {
    env: stackEnv,
    tags: stackTags,
    bucket: storageStack.bucket,
    kmsKey: storageStack.kmsKey,
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vaW5mcmEvYmluL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLHVDQUF1QztBQUN2QyxpRUFBaUU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRWpFLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsa0RBQThDO0FBQzlDLHdEQUFvRDtBQUNwRCwwREFBc0Q7QUFFdEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsTUFBTSxRQUFRLEdBQUc7SUFDZixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7SUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztDQUN0RCxDQUFDO0FBRUYsTUFBTSxTQUFTLEdBQUc7SUFDaEIsT0FBTyxFQUFFLGtCQUFrQjtJQUMzQixXQUFXLEVBQUUsTUFBTTtJQUNuQixTQUFTLEVBQUUsS0FBSztDQUNqQixDQUFDO0FBRUYsSUFBSSxzQkFBUyxDQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRTtJQUM3QyxHQUFHLEVBQUUsUUFBUTtJQUNiLElBQUksRUFBRSxTQUFTO0NBQ2hCLENBQUMsQ0FBQztBQUVILE1BQU0sWUFBWSxHQUFHLElBQUksNEJBQVksQ0FBQyxHQUFHLEVBQUUsNkJBQTZCLEVBQUU7SUFDeEUsR0FBRyxFQUFFLFFBQVE7SUFDYixJQUFJLEVBQUUsU0FBUztDQUNoQixDQUFDLENBQUM7QUFFSCxJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLDhCQUE4QixFQUFFO0lBQ3JELEdBQUcsRUFBRSxRQUFRO0lBQ2IsSUFBSSxFQUFFLFNBQVM7SUFDZixNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07SUFDM0IsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO0NBQzVCLENBQUMsQ0FBQztBQUVILEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIEFCT1VUTUU6IENESyBhcHBsaWNhdGlvbiBlbnRyeSBwb2ludFxuLy8gQUJPVVRNRTogSW5pdGlhbGl6ZXMgYW5kIHN5bnRoZXNpemVzIGFsbCBpbmZyYXN0cnVjdHVyZSBzdGFja3NcblxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEJhc2VTdGFjayB9IGZyb20gJy4uL2xpYi9iYXNlLXN0YWNrJztcbmltcG9ydCB7IFN0b3JhZ2VTdGFjayB9IGZyb20gJy4uL2xpYi9zdG9yYWdlLXN0YWNrJztcbmltcG9ydCB7IERlbGl2ZXJ5U3RhY2sgfSBmcm9tICcuLi9saWIvZGVsaXZlcnktc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG5jb25zdCBzdGFja0VudiA9IHtcbiAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ3VzLXdlc3QtMicsXG59O1xuXG5jb25zdCBzdGFja1RhZ3MgPSB7XG4gIFByb2plY3Q6ICdsbS1kYXRhcHVibGlzaGVyJyxcbiAgRW52aXJvbm1lbnQ6ICdkZW1vJyxcbiAgTWFuYWdlZEJ5OiAnY2RrJyxcbn07XG5cbm5ldyBCYXNlU3RhY2soYXBwLCAnTE1EYXRhUHVibGlzaGVyQmFzZVN0YWNrJywge1xuICBlbnY6IHN0YWNrRW52LFxuICB0YWdzOiBzdGFja1RhZ3MsXG59KTtcblxuY29uc3Qgc3RvcmFnZVN0YWNrID0gbmV3IFN0b3JhZ2VTdGFjayhhcHAsICdMTURhdGFQdWJsaXNoZXJTdG9yYWdlU3RhY2snLCB7XG4gIGVudjogc3RhY2tFbnYsXG4gIHRhZ3M6IHN0YWNrVGFncyxcbn0pO1xuXG5uZXcgRGVsaXZlcnlTdGFjayhhcHAsICdMTURhdGFQdWJsaXNoZXJEZWxpdmVyeVN0YWNrJywge1xuICBlbnY6IHN0YWNrRW52LFxuICB0YWdzOiBzdGFja1RhZ3MsXG4gIGJ1Y2tldDogc3RvcmFnZVN0YWNrLmJ1Y2tldCxcbiAga21zS2V5OiBzdG9yYWdlU3RhY2sua21zS2V5LFxufSk7XG5cbmFwcC5zeW50aCgpO1xuIl19