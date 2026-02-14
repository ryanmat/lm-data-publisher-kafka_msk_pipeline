// ABOUTME: Jest configuration for CDK infrastructure tests
// ABOUTME: Uses ts-jest for TypeScript support and CDK assertions

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/infra'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'infra/**/*.ts',
    '!infra/**/*.test.ts',
    '!infra/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
