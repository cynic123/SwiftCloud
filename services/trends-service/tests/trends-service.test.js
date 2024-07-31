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

// GetTrendsByPeriod
describe('Trends Service - GetTrendsByPeriod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves trends for a given period', async () => {
    // Mock Song.aggregate for total plays
    Song.aggregate.mockResolvedValueOnce([{ totalPlays: 9111 }]);
    
    // Mock Song.countDocuments
    Song.countDocuments.mockResolvedValueOnce(172);

    // Mock Artist.aggregate for top artists
    Artist.aggregate.mockResolvedValueOnce([
      {
        _id: '1',
        name: 'Taylor Swift',
        monthlyData: [
          { month: 'June', plays: 8097, songs: [{ song_id: 's1', title: 'Santa Baby (cover)', plays: 100 }] }
        ],
        total_plays: 8097
      },
      // Add more mock artists here to match the response structure
    ]);

    const mockCall = { request: { start_month: 5, end_month: 6 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendsByPeriod(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalledTimes(1);
    expect(Song.countDocuments).toHaveBeenCalledTimes(1);
    expect(Artist.aggregate).toHaveBeenCalledTimes(1);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      start_month: 5,
      end_month: 6,
      total_plays: 9111,
      average_plays_per_song: 52.971,
      top_artists: expect.arrayContaining([
        expect.objectContaining({
          name: 'Taylor Swift',
          total_plays: 8097,
          average_plays_per_song: expect.any(Number),
          growth_rate_per_month: 0,
          top_songs: expect.arrayContaining([
            expect.objectContaining({
              title: 'Santa Baby (cover)',
              growth_rate_per_month: 0
            })
          ])
        })
      ])
    }));
  });

  test('handles error gracefully', async () => {
    Song.aggregate.mockRejectedValueOnce(new Error('Database error'));

    const mockCall = { request: { start_month: 6, end_month: 6 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendsByPeriod(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    }));
  });

  test('handles empty results', async () => {
    Song.aggregate.mockResolvedValueOnce([]);
    Song.countDocuments.mockResolvedValueOnce(0);
    Artist.aggregate.mockResolvedValueOnce([]);

    const mockCall = { request: { start_month: 6, end_month: 6 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendsByPeriod(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      start_month: 6,
      end_month: 6,
      total_plays: 0,
      average_plays_per_song: 0,
      top_artists: []
    }));
  });

  test('handles multi-month period correctly', async () => {
    Song.aggregate.mockResolvedValueOnce([{ totalPlays: 18000 }]);
    Song.countDocuments.mockResolvedValueOnce(200);
    Artist.aggregate.mockResolvedValueOnce([
      {
        _id: '1',
        name: 'Taylor Swift',
        monthlyData: [
          { month: 'June', plays: 8000, songs: [{ song_id: 's1', title: 'Style', plays: 100 }] },
          { month: 'July', plays: 10000, songs: [{ song_id: 's1', title: 'Style', plays: 120 }] }
        ],
        total_plays: 18000
      }
    ]);

    const mockCall = { request: { start_month: 6, end_month: 7 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendsByPeriod(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      start_month: 6,
      end_month: 7,
      total_plays: 18000,
      average_plays_per_song: 90,
      top_artists: expect.arrayContaining([
        expect.objectContaining({
          name: 'Taylor Swift',
          total_plays: 18000,
          growth_rate_per_month: expect.any(Number)
        })
      ])
    }));
  });
});

describe('Trends Service - GetTrendingSongs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves trending songs with default limit when limit is not provided', async () => {
    const mockTrendingSongs = Array.from({ length: 10 }, (_, i) => ({
      title: `Song ${i + 1}`,
      artist: 'Artist',
      totalPlays: 300 - i * 10,
      growthRate: 0.1 - i * 0.01
    }));

    Song.aggregate.mockResolvedValueOnce(mockTrendingSongs);

    const mockCall = { request: { months: 3 } };  // No limit specified
    const mockCallback = jest.fn();

    await trendsService.GetTrendingSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      songs: expect.arrayContaining([
        expect.objectContaining({ title: 'Song 1', total_plays: 300 }),
        expect.objectContaining({ title: 'Song 10', total_plays: 210 })
      ])
    });
    expect(mockCallback.mock.calls[0][1].songs).toHaveLength(10);
  });

  test('uses default limit when limit is null', async () => {
    const mockTrendingSongs = Array.from({ length: 10 }, (_, i) => ({
      title: `Song ${i + 1}`,
      artist: 'Artist',
      totalPlays: 300 - i * 10,
      growthRate: 0.1 - i * 0.01
    }));

    Song.aggregate.mockResolvedValueOnce(mockTrendingSongs);

    const mockCall = { request: { months: 3, limit: null } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingSongs(mockCall, mockCallback);

    expect(mockCallback.mock.calls[0][1].songs).toHaveLength(10);
  });

  test('uses default limit when limit is not a positive integer', async () => {
    const mockTrendingSongs = Array.from({ length: 10 }, (_, i) => ({
      title: `Song ${i + 1}`,
      artist: 'Artist',
      totalPlays: 300 - i * 10,
      growthRate: 0.1 - i * 0.01
    }));

    Song.aggregate.mockResolvedValueOnce(mockTrendingSongs);

    const mockCall = { request: { months: 3, limit: -5 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingSongs(mockCall, mockCallback);

    expect(mockCallback.mock.calls[0][1].songs).toHaveLength(10);
  });

  test('respects user-provided limit when it is a positive integer', async () => {
    const mockTrendingSongs = Array.from({ length: 5 }, (_, i) => ({
      title: `Song ${i + 1}`,
      artist: 'Artist',
      totalPlays: 300 - i * 10,
      growthRate: 0.1 - i * 0.01
    }));

    Song.aggregate.mockResolvedValueOnce(mockTrendingSongs);

    const mockCall = { request: { months: 3, limit: 5 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingSongs(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, {
      songs: expect.arrayContaining([
        expect.objectContaining({ title: 'Song 1', total_plays: 300 }),
        expect.objectContaining({ title: 'Song 5', total_plays: 260 })
      ])
    });
    expect(mockCallback.mock.calls[0][1].songs).toHaveLength(5);
  });

  test('handles error gracefully', async () => {
    Song.aggregate.mockRejectedValueOnce(new Error('Database error'));

    const mockCall = { request: { months: 3 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingSongs(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    }));
  });

  test('handles empty results', async () => {
    Song.aggregate.mockResolvedValueOnce([]);

    const mockCall = { request: { months: 3 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingSongs(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, { songs: [] });
  });

  test('correctly calculates months to include', async () => {
    Song.aggregate.mockResolvedValueOnce([]);

    const mockCall = { request: { months: 3 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingSongs(mockCall, mockCallback);

    const aggregateCall = Song.aggregate.mock.calls[0][0];
    const matchStage = aggregateCall.find(stage => stage.$match);
    expect(matchStage.$match['plays.month'].$in).toHaveLength(3);
  });
});

// GetTrendingArtists
describe('Trends Service - GetTrendingArtists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves trending artists with default limit when limit is not provided', async () => {
    const mockTrendingArtists = [
      { name: 'Taylor Swift', totalPlays: 16270, growthRate: 0.009 },
      { name: 'Zayn and Taylor Swift', totalPlays: 204, growthRate: -0.019 },
      { name: 'Jack Ingram\nfeaturing Taylor Swift', totalPlays: 200, growthRate: 0.198 },
      { name: 'B.o.B\nfeaturing Taylor Swift', totalPlays: 199, growthRate: -0.087 },
      { name: 'Taylor Swift\nfeaturing Dixie Chicks', totalPlays: 188, growthRate: -0.291 }
    ];

    Artist.aggregate.mockResolvedValueOnce(mockTrendingArtists);

    const mockCall = { request: { months: 3 } };  // No limit specified
    const mockCallback = jest.fn();

    await trendsService.GetTrendingArtists(mockCall, mockCallback);

    expect(Artist.aggregate).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      artists: expect.arrayContaining([
        expect.objectContaining({
          name: 'Taylor Swift',
          total_plays: 16270,
          growth_rate_per_month: expect.any(Number)
        }),
        expect.objectContaining({
          name: 'Taylor Swift\nfeaturing Dixie Chicks',
          total_plays: 188,
          growth_rate_per_month: expect.any(Number)
        })
      ])
    });
    expect(mockCallback.mock.calls[0][1].artists).toHaveLength(5);
  });

  test('respects user-provided limit when it is a positive integer', async () => {
    const mockTrendingArtists = [
      { name: 'Taylor Swift', totalPlays: 16270, growthRate: 0.009 },
      { name: 'Zayn and Taylor Swift', totalPlays: 204, growthRate: -0.019 },
      { name: 'Jack Ingram\nfeaturing Taylor Swift', totalPlays: 200, growthRate: 0.198 }
    ];

    Artist.aggregate.mockResolvedValueOnce(mockTrendingArtists);

    const mockCall = { request: { months: 3, limit: 3 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingArtists(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, {
      artists: expect.arrayContaining([
        expect.objectContaining({
          name: 'Taylor Swift',
          total_plays: 16270,
          growth_rate_per_month: expect.any(Number)
        }),
        expect.objectContaining({
          name: 'Jack Ingram\nfeaturing Taylor Swift',
          total_plays: 200,
          growth_rate_per_month: expect.any(Number)
        })
      ])
    });
    expect(mockCallback.mock.calls[0][1].artists).toHaveLength(3);
  });

  test('handles error gracefully', async () => {
    Artist.aggregate.mockRejectedValueOnce(new Error('Database error'));

    const mockCall = { request: { months: 3, limit: 10 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingArtists(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    }));
  });

  test('handles empty results', async () => {
    Artist.aggregate.mockResolvedValueOnce([]);

    const mockCall = { request: { months: 3, limit: 10 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingArtists(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, { artists: [] });
  });

  test('correctly calculates months to include', async () => {
    Artist.aggregate.mockResolvedValueOnce([]);

    const mockCall = { request: { months: 3, limit: 10 } };
    const mockCallback = jest.fn();

    await trendsService.GetTrendingArtists(mockCall, mockCallback);

    const aggregateCall = Artist.aggregate.mock.calls[0][0];
    const matchStage = aggregateCall.find(stage => stage.$match);
    expect(matchStage.$match['plays.month'].$in).toHaveLength(3);
  });
});