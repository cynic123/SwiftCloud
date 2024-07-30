// File: jest.config.js (root directory)
module.exports = {
  projects: ['<rootDir>/services/*', '<rootDir>/swift-api', '<rootDir>/utils'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
};

// File: services/search-service/jest.config.js
// (Use similar config for songs-service, popularity-service, and trends-service)
module.exports = {
  displayName: 'search-service',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  testEnvironment: 'node',
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js'
  ],
};

// File: swift-api/jest.config.js
module.exports = {
  displayName: 'swift-api',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  testEnvironment: 'node',
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js'
  ],
};