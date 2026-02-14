"use strict";
// ABOUTME: Base stack providing common infrastructure configuration
// ABOUTME: Serves as foundation for other stacks to build upon
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
exports.BaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
class BaseStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Base stack - placeholder for common resources
        // Will be expanded as we add storage, networking, etc.
    }
}
exports.BaseStack = BaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2luZnJhL2xpYi9iYXNlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxvRUFBb0U7QUFDcEUsK0RBQStEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFL0QsaURBQW1DO0FBR25DLE1BQWEsU0FBVSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3RDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsZ0RBQWdEO1FBQ2hELHVEQUF1RDtJQUN6RCxDQUFDO0NBQ0Y7QUFQRCw4QkFPQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEFCT1VUTUU6IEJhc2Ugc3RhY2sgcHJvdmlkaW5nIGNvbW1vbiBpbmZyYXN0cnVjdHVyZSBjb25maWd1cmF0aW9uXG4vLyBBQk9VVE1FOiBTZXJ2ZXMgYXMgZm91bmRhdGlvbiBmb3Igb3RoZXIgc3RhY2tzIHRvIGJ1aWxkIHVwb25cblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgY2xhc3MgQmFzZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gQmFzZSBzdGFjayAtIHBsYWNlaG9sZGVyIGZvciBjb21tb24gcmVzb3VyY2VzXG4gICAgLy8gV2lsbCBiZSBleHBhbmRlZCBhcyB3ZSBhZGQgc3RvcmFnZSwgbmV0d29ya2luZywgZXRjLlxuICB9XG59XG4iXX0=