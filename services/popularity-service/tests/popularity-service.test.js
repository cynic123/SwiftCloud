// File: services/popularity-service/tests/popularity-service.test.js
const popularityService = require('../src/popularity-service');
const { Song } = require('../src/db');

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
    // Add other status codes as needed, in future
  },
}));

// Mock the Song model
jest.mock('../src/db', () => ({
  Song: {
    aggregate: jest.fn(),
    find: jest.fn()
  }
}));

// Health Check
describe('Health Check', () => {
  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await popularityService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Popularity Service!' });
  });
});

// Get Most Popular Songs
describe('Get Most Popular Songs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves most popular songs for monthly period', async () => {
    const mockResponse = [
      {
        month: 'June',
        songs: [
          { title: 'Song 1', artist: 'Artist 1', play_count: 100, rank: 1 },
          { title: 'Song 2', artist: 'Artist 2', play_count: 80, rank: 2 }
        ]
      }
    ];

    Song.aggregate.mockResolvedValue(mockResponse);

    const mockCall = { request: { period: 'monthly', limit: 50, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      months: {
        June: {
          songs: mockResponse[0].songs
        }
      }
    });
  });

  test('successfully retrieves most popular songs for all_time period', async () => {
    const mockResponse = [
      { title: 'Song 1', artist: 'Artist 1', play_count: 100, rank: 1 },
      { title: 'Song 2', artist: 'Artist 2', play_count: 80, rank: 2 }
    ];

    Song.aggregate.mockResolvedValue(mockResponse);

    const mockCall = { request: { period: 'all_time', limit: 50, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockResponse });
  });

  test('returns empty array when no songs match the query for monthly period', async () => {
    Song.aggregate.mockResolvedValue([]);

    const mockCall = { request: { period: 'monthly', limit: 50, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(new Error('No data found'), null);
  });

  test('returns empty array when no songs match the query for all_time period', async () => {
    Song.aggregate.mockResolvedValue([]);

    const mockCall = { request: { period: 'all_time', limit: 50, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(new Error('No data found'), null);
  });

  test('handles database query error in GetMostPopularSongs', async () => {
    Song.aggregate.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { period: 'all_time', limit: 50, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(new Error('Database error'), null);
  });

  test('uses default offset when not provided for monthly period', async () => {
    const mockResponse = [
      {
        month: 'June',
        songs: [
          { title: 'Song 1', artist: 'Artist 1', play_count: 100, rank: 1 },
          { title: 'Song 2', artist: 'Artist 2', play_count: 80, rank: 2 }
        ]
      }
    ];

    Song.aggregate.mockResolvedValue(mockResponse);

    const mockCall = { request: { period: 'monthly', limit: 50 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      months: {
        June: {
          songs: mockResponse[0].songs
        }
      }
    });
  });

  test('uses default offset when not provided for all_time period', async () => {
    const mockResponse = [
      { title: 'Song 1', artist: 'Artist 1', play_count: 100, rank: 1 },
      { title: 'Song 2', artist: 'Artist 2', play_count: 80, rank: 2 }
    ];

    Song.aggregate.mockResolvedValue(mockResponse);

    const mockCall = { request: { period: 'all_time', limit: 50 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularSongs(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockResponse });
  });
});

// Get Song Popularity
describe('GetSongPopularity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves song popularity', async () => {
    const mockMatchingSongs = [
      { _id: '1', title: 'Betty', artist: 'Taylor Swift', plays: [{ month: 'June', count: 100 }, { month: 'July', count: 105 }] },
      { _id: '2', title: 'Bette Davis Eyes (live cover)', artist: 'Taylor Swift', plays: [{ month: 'June', count: 87 }, { month: 'July', count: 100 }] },
      { _id: '3', title: 'Better than Revenge', artist: 'Taylor Swift', plays: [{ month: 'June', count: 86 }, { month: 'July', count: 100 }] },
    ];

    const mockAllSongs = [
      { _id: '1', title: 'Betty', artist: 'Taylor Swift', plays: [{ month: 'June', count: 100 }, { month: 'July', count: 105 }] },
      { _id: '2', title: 'Bette Davis Eyes (live cover)', artist: 'Taylor Swift', plays: [{ month: 'June', count: 87 }, { month: 'July', count: 100 }] },
      { _id: '3', title: 'Better than Revenge', artist: 'Taylor Swift', plays: [{ month: 'June', count: 86 }, { month: 'July', count: 100 }] },
      { _id: '4', title: 'Shake It Off', artist: 'Taylor Swift', plays: [{ month: 'June', count: 150 }, { month: 'July', count: 200 }] },
      { _id: '5', title: 'Love Story', artist: 'Taylor Swift', plays: [{ month: 'June', count: 90 }, { month: 'July', count: 95 }] },
      { _id: '6', title: 'You Belong with Me', artist: 'Taylor Swift', plays: [{ month: 'June', count: 140 }, { month: 'July', count: 150 }] },
      { _id: '7', title: 'Blank Space', artist: 'Taylor Swift', plays: [{ month: 'June', count: 120 }, { month: 'July', count: 130 }] },
      { _id: '8', title: 'Bad Blood', artist: 'Taylor Swift', plays: [{ month: 'June', count: 110 }, { month: 'July', count: 115 }] },
      { _id: '9', title: 'We Are Never Ever Getting Back Together', artist: 'Taylor Swift', plays: [{ month: 'June', count: 130 }, { month: 'July', count: 140 }] },
      { _id: '10', title: 'Wildest Dreams', artist: 'Taylor Swift', plays: [{ month: 'June', count: 95 }, { month: 'July', count: 100 }] },
    ];

    Song.find.mockResolvedValueOnce(mockMatchingSongs).mockResolvedValueOnce(mockAllSongs);

    const mockCall = { request: { title: 'Bet' } };
    const mockCallback = jest.fn();

    await popularityService.GetSongPopularity(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      rankings: [
        {
          title: 'Betty',
          artist: 'Taylor Swift',
          play_count: 205,
          rank: expect.any(Number)
        },
        {
          title: 'Bette Davis Eyes (live cover)',
          artist: 'Taylor Swift',
          play_count: 187,
          rank: expect.any(Number)
        },
        {
          title: 'Better than Revenge',
          artist: 'Taylor Swift',
          play_count: 186,
          rank: expect.any(Number)
        }
      ]
    });
  });

  test('returns NOT_FOUND error when no songs match the query', async () => {
    Song.find
      .mockResolvedValueOnce([]) // No matching songs
      .mockResolvedValueOnce([]); // All songs (should not be called in this case)

    const mockCall = { request: { title: 'Nonexistent' } };
    const mockCallback = jest.fn();

    await popularityService.GetSongPopularity(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      code: grpc.status.NOT_FOUND,
      details: "No songs found"
    });
  });

  test('handles database error gracefully', async () => {
    Song.find.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { title: 'Test' } };
    const mockCallback = jest.fn();

    await popularityService.GetSongPopularity(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      code: grpc.status.INTERNAL,
      details: "Internal server error"
    });
  });
});