// File: services/popularity-service/tests/popularity-service.test.js
const searchService = require('../src/popularity-service');

jest.mock('@grpc/grpc-js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    addService: jest.fn(),
    bindAsync: jest.fn((_, __, cb) => cb(null, 8000)),
    start: jest.fn(),
  })),
  ServerCredentials: {
    createInsecure: jest.fn(),
  },
  status: {
    INTERNAL: 13,
    // Add other status codes as needed
  },
}));

describe('Popularity Service', () => {
  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await searchService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Popularity Service!' });
  });

  // Add more tests for other functions in your service
});