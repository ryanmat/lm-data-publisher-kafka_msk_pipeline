"use strict";
// ABOUTME: Helper utilities for CDK Nag testing
// ABOUTME: Provides functions to apply and validate CDK Nag rules in tests
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
exports.applyNagChecks = applyNagChecks;
exports.getHighSeverityFindings = getHighSeverityFindings;
exports.assertNoHighFindings = assertNoHighFindings;
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const cdk_nag_1 = require("cdk-nag");
/**
 * Apply CDK Nag checks to a stack and return any High severity findings
 */
function applyNagChecks(stack, suppressions = []) {
    // Apply AWS Solutions checks
    cdk.Aspects.of(stack).add(new cdk_nag_1.AwsSolutionsChecks({ verbose: false }));
    // Apply suppressions if provided
    if (suppressions.length > 0) {
        suppressions.forEach((suppression) => {
            // Note: Suppressions would typically be added via NagSuppressions.addStackSuppressions
            // This is a placeholder for the pattern
        });
    }
}
/**
 * Get all High severity findings from a stack
 */
function getHighSeverityFindings(stack) {
    const annotations = assertions_1.Annotations.fromStack(stack);
    const messages = annotations.findError('*', assertions_1.Match.anyValue());
    return messages
        .filter((msg) => msg.entry.data &&
        typeof msg.entry.data === 'string' &&
        msg.entry.data.includes('[HIGH]'))
        .map((msg) => msg.entry.data);
}
/**
 * Assert that a stack has no High severity findings
 * Throws if High findings are present
 */
function assertNoHighFindings(stack) {
    const highFindings = getHighSeverityFindings(stack);
    if (highFindings.length > 0) {
        throw new Error(`CDK Nag found ${highFindings.length} High severity finding(s):\n` +
            highFindings.map((f, i) => `  ${i + 1}. ${f}`).join('\n'));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFnLXRlc3QtaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vaW5mcmEvbGliL25hZy10ZXN0LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsZ0RBQWdEO0FBQ2hELDJFQUEyRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFVM0Usd0NBY0M7QUFLRCwwREFXQztBQU1ELG9EQVNDO0FBckRELGlEQUFtQztBQUNuQyx1REFBNEQ7QUFDNUQscUNBQWlFO0FBR2pFOztHQUVHO0FBQ0gsU0FBZ0IsY0FBYyxDQUM1QixLQUFnQixFQUNoQixlQUFxQyxFQUFFO0lBRXZDLDZCQUE2QjtJQUM3QixHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSw0QkFBa0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFdEUsaUNBQWlDO0lBQ2pDLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM1QixZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDbkMsdUZBQXVGO1lBQ3ZGLHdDQUF3QztRQUMxQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxLQUFnQjtJQUN0RCxNQUFNLFdBQVcsR0FBRyx3QkFBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqRCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxrQkFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFFOUQsT0FBTyxRQUFRO1NBQ1osTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDZCxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUk7UUFDZCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVE7UUFDbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUNsQztTQUNBLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFjLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsS0FBZ0I7SUFDbkQsTUFBTSxZQUFZLEdBQUcsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFcEQsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzVCLE1BQU0sSUFBSSxLQUFLLENBQ2IsaUJBQWlCLFlBQVksQ0FBQyxNQUFNLDhCQUE4QjtZQUNoRSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUM1RCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBQk9VVE1FOiBIZWxwZXIgdXRpbGl0aWVzIGZvciBDREsgTmFnIHRlc3Rpbmdcbi8vIEFCT1VUTUU6IFByb3ZpZGVzIGZ1bmN0aW9ucyB0byBhcHBseSBhbmQgdmFsaWRhdGUgQ0RLIE5hZyBydWxlcyBpbiB0ZXN0c1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQW5ub3RhdGlvbnMsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBBd3NTb2x1dGlvbnNDaGVja3MsIE5hZ1BhY2tTdXBwcmVzc2lvbiB9IGZyb20gJ2Nkay1uYWcnO1xuaW1wb3J0IHsgSUNvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG4vKipcbiAqIEFwcGx5IENESyBOYWcgY2hlY2tzIHRvIGEgc3RhY2sgYW5kIHJldHVybiBhbnkgSGlnaCBzZXZlcml0eSBmaW5kaW5nc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlOYWdDaGVja3MoXG4gIHN0YWNrOiBjZGsuU3RhY2ssXG4gIHN1cHByZXNzaW9uczogTmFnUGFja1N1cHByZXNzaW9uW10gPSBbXVxuKTogdm9pZCB7XG4gIC8vIEFwcGx5IEFXUyBTb2x1dGlvbnMgY2hlY2tzXG4gIGNkay5Bc3BlY3RzLm9mKHN0YWNrKS5hZGQobmV3IEF3c1NvbHV0aW9uc0NoZWNrcyh7IHZlcmJvc2U6IGZhbHNlIH0pKTtcblxuICAvLyBBcHBseSBzdXBwcmVzc2lvbnMgaWYgcHJvdmlkZWRcbiAgaWYgKHN1cHByZXNzaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgc3VwcHJlc3Npb25zLmZvckVhY2goKHN1cHByZXNzaW9uKSA9PiB7XG4gICAgICAvLyBOb3RlOiBTdXBwcmVzc2lvbnMgd291bGQgdHlwaWNhbGx5IGJlIGFkZGVkIHZpYSBOYWdTdXBwcmVzc2lvbnMuYWRkU3RhY2tTdXBwcmVzc2lvbnNcbiAgICAgIC8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciBmb3IgdGhlIHBhdHRlcm5cbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBhbGwgSGlnaCBzZXZlcml0eSBmaW5kaW5ncyBmcm9tIGEgc3RhY2tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEhpZ2hTZXZlcml0eUZpbmRpbmdzKHN0YWNrOiBjZGsuU3RhY2spOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFubm90YXRpb25zID0gQW5ub3RhdGlvbnMuZnJvbVN0YWNrKHN0YWNrKTtcbiAgY29uc3QgbWVzc2FnZXMgPSBhbm5vdGF0aW9ucy5maW5kRXJyb3IoJyonLCBNYXRjaC5hbnlWYWx1ZSgpKTtcblxuICByZXR1cm4gbWVzc2FnZXNcbiAgICAuZmlsdGVyKChtc2cpID0+XG4gICAgICBtc2cuZW50cnkuZGF0YSAmJlxuICAgICAgdHlwZW9mIG1zZy5lbnRyeS5kYXRhID09PSAnc3RyaW5nJyAmJlxuICAgICAgbXNnLmVudHJ5LmRhdGEuaW5jbHVkZXMoJ1tISUdIXScpXG4gICAgKVxuICAgIC5tYXAoKG1zZykgPT4gbXNnLmVudHJ5LmRhdGEgYXMgc3RyaW5nKTtcbn1cblxuLyoqXG4gKiBBc3NlcnQgdGhhdCBhIHN0YWNrIGhhcyBubyBIaWdoIHNldmVyaXR5IGZpbmRpbmdzXG4gKiBUaHJvd3MgaWYgSGlnaCBmaW5kaW5ncyBhcmUgcHJlc2VudFxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Tm9IaWdoRmluZGluZ3Moc3RhY2s6IGNkay5TdGFjayk6IHZvaWQge1xuICBjb25zdCBoaWdoRmluZGluZ3MgPSBnZXRIaWdoU2V2ZXJpdHlGaW5kaW5ncyhzdGFjayk7XG5cbiAgaWYgKGhpZ2hGaW5kaW5ncy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYENESyBOYWcgZm91bmQgJHtoaWdoRmluZGluZ3MubGVuZ3RofSBIaWdoIHNldmVyaXR5IGZpbmRpbmcocyk6XFxuYCArXG4gICAgICAgIGhpZ2hGaW5kaW5ncy5tYXAoKGYsIGkpID0+IGAgICR7aSArIDF9LiAke2Z9YCkuam9pbignXFxuJylcbiAgICApO1xuICB9XG59XG4iXX0=