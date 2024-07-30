// File: services/songs-service/tests/songs-service.test.js
const songsService = require('../src/songs-service');

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

describe('Songs Service', () => {
  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await songsService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Songs Service!' });
  });

  // Add more tests for other functions in your service
});