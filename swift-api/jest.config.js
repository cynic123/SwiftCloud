module.exports = {
  displayName: '<service-name>',
  testMatch: ['<rootDir>/tests/*.test.js'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  testEnvironment: 'node',
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js'
  ],
};