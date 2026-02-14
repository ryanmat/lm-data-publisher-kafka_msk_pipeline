// ABOUTME: Jest setup file for CDK tests
// ABOUTME: Mocks localStorage to avoid SecurityError in node environment

// Mock localStorage for CDK tests
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
