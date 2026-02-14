"use strict";
// ABOUTME: Tests for BaseStack infrastructure
// ABOUTME: Validates stack synthesis and basic properties
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
const base_stack_1 = require("./base-stack");
const nag_test_helper_1 = require("./nag-test-helper");
const nag_suppressions_1 = require("./nag-suppressions");
describe('BaseStack', () => {
    test('Stack synthesizes successfully', () => {
        const app = new cdk.App();
        const stack = new base_stack_1.BaseStack(app, 'TestStack');
        const template = assertions_1.Template.fromStack(stack);
        // Verify template can be synthesized
        expect(template).toBeDefined();
    });
    test('Stack has correct tags', () => {
        const app = new cdk.App();
        const stack = new base_stack_1.BaseStack(app, 'TestStack', {
            tags: {
                Project: 'test-project',
            },
        });
        expect(stack.tags).toBeDefined();
    });
    test('CDK Nag - No High severity findings', () => {
        const app = new cdk.App();
        const stack = new base_stack_1.BaseStack(app, 'TestNagStack');
        // Apply CDK Nag checks
        (0, nag_test_helper_1.applyNagChecks)(stack, nag_suppressions_1.globalSuppressions);
        // Synthesize to trigger nag checks
        app.synth();
        // Assert no High findings (will throw if any exist)
        (0, nag_test_helper_1.assertNoHighFindings)(stack);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1zdGFjay50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vaW5mcmEvbGliL2Jhc2Utc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsOENBQThDO0FBQzlDLDBEQUEwRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFMUQsaURBQW1DO0FBQ25DLHVEQUFrRDtBQUNsRCw2Q0FBeUM7QUFDekMsdURBQXlFO0FBQ3pFLHlEQUF3RDtBQUV4RCxRQUFRLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN6QixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksc0JBQVMsQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUMsTUFBTSxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0MscUNBQXFDO1FBQ3JDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUU7WUFDNUMsSUFBSSxFQUFFO2dCQUNKLE9BQU8sRUFBRSxjQUFjO2FBQ3hCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNuQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDL0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVqRCx1QkFBdUI7UUFDdkIsSUFBQSxnQ0FBYyxFQUFDLEtBQUssRUFBRSxxQ0FBa0IsQ0FBQyxDQUFDO1FBRTFDLG1DQUFtQztRQUNuQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFWixvREFBb0Q7UUFDcEQsSUFBQSxzQ0FBb0IsRUFBQyxLQUFLLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQUJPVVRNRTogVGVzdHMgZm9yIEJhc2VTdGFjayBpbmZyYXN0cnVjdHVyZVxuLy8gQUJPVVRNRTogVmFsaWRhdGVzIHN0YWNrIHN5bnRoZXNpcyBhbmQgYmFzaWMgcHJvcGVydGllc1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCB7IEJhc2VTdGFjayB9IGZyb20gJy4vYmFzZS1zdGFjayc7XG5pbXBvcnQgeyBhcHBseU5hZ0NoZWNrcywgYXNzZXJ0Tm9IaWdoRmluZGluZ3MgfSBmcm9tICcuL25hZy10ZXN0LWhlbHBlcic7XG5pbXBvcnQgeyBnbG9iYWxTdXBwcmVzc2lvbnMgfSBmcm9tICcuL25hZy1zdXBwcmVzc2lvbnMnO1xuXG5kZXNjcmliZSgnQmFzZVN0YWNrJywgKCkgPT4ge1xuICB0ZXN0KCdTdGFjayBzeW50aGVzaXplcyBzdWNjZXNzZnVsbHknLCAoKSA9PiB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBjb25zdCBzdGFjayA9IG5ldyBCYXNlU3RhY2soYXBwLCAnVGVzdFN0YWNrJyk7XG4gICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgLy8gVmVyaWZ5IHRlbXBsYXRlIGNhbiBiZSBzeW50aGVzaXplZFxuICAgIGV4cGVjdCh0ZW1wbGF0ZSkudG9CZURlZmluZWQoKTtcbiAgfSk7XG5cbiAgdGVzdCgnU3RhY2sgaGFzIGNvcnJlY3QgdGFncycsICgpID0+IHtcbiAgICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIGNvbnN0IHN0YWNrID0gbmV3IEJhc2VTdGFjayhhcHAsICdUZXN0U3RhY2snLCB7XG4gICAgICB0YWdzOiB7XG4gICAgICAgIFByb2plY3Q6ICd0ZXN0LXByb2plY3QnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGV4cGVjdChzdGFjay50YWdzKS50b0JlRGVmaW5lZCgpO1xuICB9KTtcblxuICB0ZXN0KCdDREsgTmFnIC0gTm8gSGlnaCBzZXZlcml0eSBmaW5kaW5ncycsICgpID0+IHtcbiAgICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIGNvbnN0IHN0YWNrID0gbmV3IEJhc2VTdGFjayhhcHAsICdUZXN0TmFnU3RhY2snKTtcblxuICAgIC8vIEFwcGx5IENESyBOYWcgY2hlY2tzXG4gICAgYXBwbHlOYWdDaGVja3Moc3RhY2ssIGdsb2JhbFN1cHByZXNzaW9ucyk7XG5cbiAgICAvLyBTeW50aGVzaXplIHRvIHRyaWdnZXIgbmFnIGNoZWNrc1xuICAgIGFwcC5zeW50aCgpO1xuXG4gICAgLy8gQXNzZXJ0IG5vIEhpZ2ggZmluZGluZ3MgKHdpbGwgdGhyb3cgaWYgYW55IGV4aXN0KVxuICAgIGFzc2VydE5vSGlnaEZpbmRpbmdzKHN0YWNrKTtcbiAgfSk7XG59KTtcbiJdfQ==