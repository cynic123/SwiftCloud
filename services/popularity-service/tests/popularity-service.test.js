// File: services/popularity-service/tests/popularity-service.test.js
const popularityService = require('../src/popularity-service');
const { Song, Album } = require('../src/db');

jest.mock('@grpc/grpc-js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    addService: jest.fn(),
    bindAsync: jest.fn((_, __, cb) => cb(null, 8000)),
    start: jest.fn(),
  })),
  ServerCredentials: {
    createInsecure: jest.fn(),
  }
}));

// Mock the Song model
jest.mock('../src/db', () => ({
  Song: {
    aggregate: jest.fn(),
    find: jest.fn()
  },
  Album: {
    aggregate: jest.fn(),
    find: jest.fn()
  }
}));

// Health Check
describe('Popularity Service - HealthCheck', () => {
  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await popularityService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Popularity Service!' });
  });
});

// Get Most Popular Songs
describe('Popularity Service - Get Most Popular Songs', () => {
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
describe('Popularity Service - GetSongPopularity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves song popularity', async () => {
    const mockMatchingSongs = [
      { _id: '1', title: "You're Not Sorry", artist: 'Taylor Swift', plays: [{ month: 'June', count: 100 }, { month: 'July', count: 125 }] },
      { _id: '2', title: 'You Are in Love', artist: 'Taylor Swift', plays: [{ month: 'June', count: 89 }, { month: 'July', count: 100 }] },
      { _id: '3', title: 'You Need to Calm Down', artist: 'Taylor Swift', plays: [{ month: 'June', count: 86 }, { month: 'July', count: 100 }] },
      { _id: '4', title: 'You Belong with Me', artist: 'Taylor Swift', plays: [{ month: 'June', count: 76 }, { month: 'July', count: 100 }] },
    ];

    // Mock a larger set of all songs to generate realistic rankings
    const mockAllSongs = [
      ...mockMatchingSongs,
      // Add more mock songs here to simulate a larger database and generate the correct ranks
    ];

    Song.find.mockResolvedValueOnce(mockMatchingSongs).mockResolvedValueOnce(mockAllSongs);

    const mockCall = { request: { title: 'yo' } };
    const mockCallback = jest.fn();

    await popularityService.GetSongPopularity(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      rankings: [
        {
          songId: '1',
          title: "You're Not Sorry",
          artist: 'Taylor Swift',
          play_count: 225,
          rank: 1
        },
        {
          songId: '2',
          title: 'You Are in Love',
          artist: 'Taylor Swift',
          play_count: 189,
          rank: 2
        },
        {
          songId: '3',
          title: 'You Need to Calm Down',
          artist: 'Taylor Swift',
          play_count: 186,
          rank: 3
        },
        {
          songId: '4',
          title: 'You Belong with Me',
          artist: 'Taylor Swift',
          play_count: 176,
          rank: 4
        }
      ]
    });
  });

  test('returns NOT_FOUND error when no songs match the query', async () => {
    Song.find.mockResolvedValueOnce([]);

    const mockCall = { request: { title: 'Nonexistent' } };
    const mockCallback = jest.fn();

    await popularityService.GetSongPopularity(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      code: 404,
      message: 'No songs found',
      status: 'NOT_FOUND'
    });
  });

  test('handles database error gracefully', async () => {
    Song.find.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { title: 'Test' } };
    const mockCallback = jest.fn();

    await popularityService.GetSongPopularity(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });
});

// GetMostPopularAlbumsMonthly
describe('Popularity Service - GetMostPopularAlbumsMonthly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves most popular albums monthly with pagination', async () => {
    const mockResponse = [
      { month: 'June', albums: [{ name: 'Lover', artist: 'Taylor Swift', play_count: 1141, rank: 1 }] },
      { month: 'July', albums: [{ name: 'Lover', artist: 'Taylor Swift', play_count: 1006, rank: 1 }] },
      { month: 'August', albums: [{ name: 'Reputation', artist: 'Taylor Swift', play_count: 1019, rank: 1 }] }
    ];

    Album.aggregate.mockResolvedValue(mockResponse);

    const mockCall = { request: { limit: 5, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsMonthly(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      months: {
        'June': { albums: mockResponse[0].albums },
        'July': { albums: mockResponse[1].albums },
        'August': { albums: mockResponse[2].albums }
      }
    });
  });

  test('returns error when no albums match the query for monthly data', async () => {
    Album.aggregate.mockResolvedValue([]);

    const mockCall = { request: { limit: 5, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsMonthly(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith({
      code: 404,
      message: 'No albums found',
      status: 'NOT_FOUND'
    });
  });

  test('handles database query error in GetMostPopularAlbumsMonthly', async () => {
    const error = new Error('Database error');
    Album.aggregate.mockRejectedValue(error);

    const mockCall = { request: { limit: 5, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsMonthly(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(error, null);
  });

  test('uses default limit and offset when not provided', async () => {
    const mockResponse = [
      {
        month: 'June',
        albums: [
          { name: 'Album 2', artist: 'Artist 2', play_count: 200, rank: 1 },
          { name: 'Album 1', artist: 'Artist 1', play_count: 100, rank: 2 }
        ]
      }
    ];

    Album.aggregate.mockResolvedValue(mockResponse);

    const mockCall = { request: {} }; // Empty request to test defaults
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsMonthly(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      months: {
        'June': {
          albums: mockResponse[0].albums
        }
      }
    });
  });
});

// GetMostPopularAlbumsAllTime
describe('Popularity Service - GetMostPopularAlbumsAllTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves most popular albums all time with pagination', async () => {
    const mockAlbums = [
      { name: 'Lover', artist: 'Taylor Swift', play_count: 3130, rank: 1 },
      { name: 'Folklore', artist: 'Taylor Swift', play_count: 2704, rank: 2 }
    ];

    Album.aggregate.mockResolvedValue(mockAlbums);

    const mockCall = { request: { limit: 5, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsAllTime(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, { albums: mockAlbums });
  });

  test('returns error when no albums match the query for all time', async () => {
    Album.aggregate.mockResolvedValue([]);

    const mockCall = { request: { limit: 5, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsAllTime(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith({
      code: 404,
      message: 'No albums found',
      status: 'NOT_FOUND'
    });
  });

  test('handles database query error in GetMostPopularAlbumsAllTime', async () => {
    const error = new Error('Database error');
    Album.aggregate.mockRejectedValue(error);

    const mockCall = { request: { limit: 5, offset: 0 } };
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsAllTime(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(error, null);
  });

  test('uses default limit and offset when not provided', async () => {
    const mockResponse = [
      { name: 'Album 2', artist: 'Artist 2', play_count: 200, rank: 1 },
      { name: 'Album 1', artist: 'Artist 1', play_count: 100, rank: 2 }
    ];

    Album.aggregate.mockResolvedValue(mockResponse);

    const mockCall = { request: {} };  // Empty request to test defaults
    const mockCallback = jest.fn();

    await popularityService.GetMostPopularAlbumsAllTime(mockCall, mockCallback);

    expect(Album.aggregate).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      albums: mockResponse
    });
  });
});

// GetAlbumPopularity
describe('Popularity Service - GetAlbumPopularity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves album popularity', async () => {
    const mockMatchingAlbums = [
      {
        name: 'Speak Now',
        artist: 'Taylor Swift',
        plays: [
          { month: 'June', count: 1000 },
          { month: 'July', count: 1532 }
        ]
      },
      {
        name: 'Speak Now World Tour – Live',
        artist: 'Taylor Swift',
        plays: [
          { month: 'June', count: 400 },
          { month: 'July', count: 458 }
        ]
      },
      {
        name: 'Speak Now (Deluxe edition)',
        artist: 'Taylor Swift',
        plays: [
          { month: 'June', count: 200 },
          { month: 'July', count: 242 }
        ]
      },
    ];

    const mockAllAlbums = [
      ...mockMatchingAlbums,
      {
        name: 'Fearless',
        artist: 'Taylor Swift',
        plays: [
          { month: 'June', count: 2000 },
          { month: 'July', count: 2500 }
        ]
      },
      {
        name: '1989',
        artist: 'Taylor Swift',
        plays: [
          { month: 'June', count: 3000 },
          { month: 'July', count: 3500 }
        ]
      },
    ];

    Album.find.mockResolvedValueOnce(mockMatchingAlbums).mockResolvedValueOnce(mockAllAlbums);

    const mockCall = { request: { name: 'Speak' } };
    const mockCallback = jest.fn();

    await popularityService.GetAlbumPopularity(mockCall, mockCallback);

    expect(Album.find).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      rankings: [
        {
          name: 'Speak Now',
          artist: 'Taylor Swift',
          play_count: 2532,
          rank: 3
        },
        {
          name: 'Speak Now World Tour – Live',
          artist: 'Taylor Swift',
          play_count: 858,
          rank: 4
        },
        {
          name: 'Speak Now (Deluxe edition)',
          artist: 'Taylor Swift',
          play_count: 442,
          rank: 5
        }
      ]
    });
  });

  test('returns NOT_FOUND error when no albums match the query', async () => {
    Album.find.mockResolvedValueOnce([]);

    const mockCall = { request: { name: 'Nonexistent' } };
    const mockCallback = jest.fn();

    await popularityService.GetAlbumPopularity(mockCall, mockCallback);

    expect(Album.find).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      code: 404,
      message: 'No albums found',
      status: 'NOT_FOUND'
    });
  });

  test('handles database error gracefully', async () => {
    Album.find.mockRejectedValueOnce(new Error('Database error'));

    const mockCall = { request: { name: 'Test' } };
    const mockCallback = jest.fn();

    await popularityService.GetAlbumPopularity(mockCall, mockCallback);

    expect(Album.find).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });
});