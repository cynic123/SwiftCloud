// File: services/trends-service/tests/trends-service.test.js
const trendsService = require('../src/trends-service');
const { Song, Artist } = require('../src/db');

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

// Mock the DB
jest.mock('../src/db', () => ({
  Song: {
    aggregate: jest.fn(),
    countDocuments: jest.fn()
  },
  Artist: {
    aggregate: jest.fn()
  }
}));

// Health Check
describe('Trends Service - HealthCheck', () => {
  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await trendsService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Trends Service!' });
  });
});

// GetOverallTrends
describe('Trends Service - GetOverallTrends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves overall trends', async () => {
    // Mock Song.aggregate for total plays
    Song.aggregate.mockResolvedValueOnce([{ total: 28694 }]);

    // Mock Song.countDocuments
    Song.countDocuments.mockResolvedValueOnce(172);

    // Mock Artist.aggregate for top artists
    Artist.aggregate.mockResolvedValueOnce([
      {
        _id: '1',
        name: 'Taylor Swift',
        monthlyData: [
          { month: 'June', plays: 8000, songs: [{ song_id: 's1', title: 'Style', plays: 100 }] },
          { month: 'July', plays: 8200, songs: [{ song_id: 's1', title: 'Style', plays: 98 }] },
          { month: 'August', plays: 9182, songs: [{ song_id: 's1', title: 'Style', plays: 95 }] }
        ],
        total_plays: 25382
      },
      // Add more mock artists here to match the response structure
    ]);

    const mockCall = {};
    const mockCallback = jest.fn();

    await trendsService.GetOverallTrends(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalledTimes(1);
    expect(Song.countDocuments).toHaveBeenCalledTimes(1);
    expect(Artist.aggregate).toHaveBeenCalledTimes(1);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      total_plays: 28694,
      average_plays_per_song: 166.826,
      top_artists: expect.arrayContaining([
        expect.objectContaining({
          name: 'Taylor Swift',
          total_plays: 25382,
          average_plays_per_song: expect.any(Number),
          growth_rate_per_month: expect.any(Number),
          top_songs: expect.arrayContaining([
            expect.objectContaining({
              title: expect.any(String),
              growth_rate_per_month: expect.any(Number)
            })
          ])
        })
      ])
    }));
  });

  test('handles error gracefully', async () => {
    Song.aggregate.mockRejectedValueOnce(new Error('Database error'));

    const mockCall = {};
    const mockCallback = jest.fn();

    await trendsService.GetOverallTrends(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });

  test('handles empty results', async () => {
    Song.aggregate.mockResolvedValueOnce([]);
    Song.countDocuments.mockResolvedValueOnce(0);
    Artist.aggregate.mockResolvedValueOnce([]);

    const mockCall = {};
    const mockCallback = jest.fn();

    await trendsService.GetOverallTrends(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      total_plays: 0,
      average_plays_per_song: 0,
      top_artists: []
    }));
  });
});