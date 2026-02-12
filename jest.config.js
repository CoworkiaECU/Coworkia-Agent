export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  modulePaths: ['<rootDir>'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/express-servidor/index.js', // Entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 15000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
