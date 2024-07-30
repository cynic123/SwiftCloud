// File: jest.config.js (root directory)
module.exports = {
  projects: ['<rootDir>/services/*', '<rootDir>/swift-api'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
};