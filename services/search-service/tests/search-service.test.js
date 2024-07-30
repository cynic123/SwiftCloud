const searchService = require('../src/search-service');
const { Song } = require('../src/db');

// Mock the Song model
jest.mock('../src/db', () => ({
  Song: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  }
}));

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

// Basic Search
describe('Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockQueryBuilder = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis()
  };

  Song.find.mockImplementation(() => mockQueryBuilder);

  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await searchService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Search Service!' });
  });

  test('successfully retrieves songs based on the search query', async () => {
    const mockSongs = [
      {
        _id: '66a8f801aa4cecd403f93a85',
        title: '22',
        artist: 'Taylor Swift',
        writers: ['Taylor Swift', 'Max Martin', 'Shellback'],
        album: 'Red',
        year: 2012,
        plays: [
          { month: 'June', count: 27 },
          { month: 'July', count: 30 },
          { month: 'August', count: 32 }
        ]
      }
    ];

    const query = 'Max Martin';
    const limit = 10;
    const offset = 0;
    const totalResults = 22;

    mockQueryBuilder.lean.mockResolvedValue(mockSongs);
    Song.countDocuments.mockResolvedValue(totalResults);

    const mockCall = { request: { query, limit, offset } };
    const mockCallback = jest.fn();

    await searchService.Search(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { album: { $regex: query, $options: 'i' } },
        { writers: { $regex: query, $options: 'i' } }
      ]
    });
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(offset);
    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit);
    expect(Song.countDocuments).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { album: { $regex: query, $options: 'i' } },
        { writers: { $regex: query, $options: 'i' } }
      ]
    });

    const formattedResults = mockSongs.map(song => ({
      id: song._id.toString(),
      title: song.title,
      artist: song.artist,
      writers: song.writers,
      album: song.album,
      year: song.year,
      plays: song.plays
    }));

    expect(mockCallback).toHaveBeenCalledWith(null, {
      results: formattedResults,
      total_results: totalResults
    });
  });

  test('returns empty array when no songs match the query', async () => {
    mockQueryBuilder.lean.mockResolvedValue([]);
    Song.countDocuments.mockResolvedValue(0);

    const mockCall = { request: { query: 'NonexistentArtist', limit: 10, offset: 0 } };
    const mockCallback = jest.fn();

    await searchService.Search(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, { results: [], total_results: 0 });
  });

  test('handles database query error', async () => {
    mockQueryBuilder.lean.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { query: 'Max Martin', limit: 10, offset: 0 } };
    const mockCallback = jest.fn();

    await searchService.Search(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });

  test('uses default limit and offset when not provided', async () => {
    mockQueryBuilder.lean.mockResolvedValue([]);
    Song.countDocuments.mockResolvedValue(0);

    const mockCall = { request: { query: 'Max Martin' } };
    const mockCallback = jest.fn();

    await searchService.Search(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: 'Max Martin', $options: 'i' } },
        { artist: { $regex: 'Max Martin', $options: 'i' } },
        { album: { $regex: 'Max Martin', $options: 'i' } },
        { writers: { $regex: 'Max Martin', $options: 'i' } }
      ]
    });
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);

    expect(mockCallback).toHaveBeenCalledWith(null, { results: [], total_results: 0 });
  });
});

describe('Advanced Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves songs based on the advanced search query', async () => {
    const mockSongs = [
      {
        _id: '66a908fe9e100e57f9a57dd5',
        title: 'I Did Something Bad',
        artist: 'Taylor Swift',
        writers: ['Taylor Swift', 'Max Martin', 'Shellback'],
        album: 'Reputation',
        year: 2017,
        plays: [
          { month: 'June', count: 66 },
          { month: 'July', count: 16 },
          { month: 'August', count: 4 }
        ],
        relevance_score: 0.25
      },
      // Add more mock songs as needed
    ];

    const query = 'Max Martin';
    const filters = [{ field: 'year', operator: 'gte', value: 2008 }];
    const sort = { field: 'year', order: 'desc' };
    const limit = 20;
    const offset = 0;
    const totalResults = 22;

    Song.aggregate.mockResolvedValue(mockSongs);
    Song.countDocuments.mockResolvedValue(totalResults);

    const mockCall = { request: { query, filters, sort, limit, offset } };
    const mockCallback = jest.fn();

    await searchService.AdvancedSearch(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalledWith(expect.any(Array));
    expect(Song.countDocuments).toHaveBeenCalledWith(expect.any(Object));

    const formattedResults = mockSongs.map(song => ({
      id: song._id.toString(),
      title: song.title,
      artist: song.artist,
      writers: song.writers,
      album: song.album,
      year: song.year,
      plays: song.plays,
      relevance_score: song.relevance_score
    }));

    expect(mockCallback).toHaveBeenCalledWith(null, {
      results: formattedResults,
      total_results: totalResults
    });
  });

  test('returns empty array when no songs match the advanced search query', async () => {
    Song.aggregate.mockResolvedValue([]);
    Song.countDocuments.mockResolvedValue(0);

    const mockCall = { request: { query: 'NonexistentArtist', filters: [], sort: {}, limit: 10, offset: 0 } };
    const mockCallback = jest.fn();

    await searchService.AdvancedSearch(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, { results: [], total_results: 0 });
  });

  test('handles database query error in advanced search', async () => {
    Song.aggregate.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { query: 'Max Martin', filters: [], sort: {}, limit: 10, offset: 0 } };
    const mockCallback = jest.fn();

    await searchService.AdvancedSearch(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });

  test('uses default limit and offset when not provided in advanced search', async () => {
    Song.aggregate.mockResolvedValue([]);
    Song.countDocuments.mockResolvedValue(0);

    const mockCall = { request: { query: 'Max Martin', filters: [], sort: {} } };
    const mockCallback = jest.fn();

    await searchService.AdvancedSearch(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      { $skip: 0 },
      { $limit: 10 }
    ]));
  });
});

// Autocomplete Service
describe('Autocomplete Service', () => {
  test('successfully retrieves autocomplete suggestions based on the query', async () => {
    const mockSuggestions = [
      { value: 'Speak Now', type: 'album' },
      { value: 'Speak Now\n(Deluxe edition)', type: 'album' },
      { value: 'Speak Now World Tour – Live', type: 'album' }
    ];

    const query = 'spe';
    const limit = 5;

    Song.aggregate.mockResolvedValue(mockSuggestions);

    const mockCall = { request: { query, limit } };
    const mockCallback = jest.fn();

    await searchService.Autocomplete(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          $or: [
            { title: new RegExp(`^${query}`, 'i') },
            { artist: new RegExp(`^${query}`, 'i') },
            { album: new RegExp(`^${query}`, 'i') },
            { writers: new RegExp(`^${query}`, 'i') }
          ]
        }
      },
      {
        $project: {
          suggestions: [
            { $cond: [{ $regexMatch: { input: "$title", regex: new RegExp(`^${query}`, 'i') } }, { value: "$title", type: "title" }, null] },
            { $cond: [{ $regexMatch: { input: "$artist", regex: new RegExp(`^${query}`, 'i') } }, { value: "$artist", type: "artist" }, null] },
            { $cond: [{ $regexMatch: { input: "$album", regex: new RegExp(`^${query}`, 'i') } }, { value: "$album", type: "album" }, null] },
            { $cond: [{ $regexMatch: { input: { $arrayElemAt: ["$writers", 0] }, regex: new RegExp(`^${query}`, 'i') } }, { value: { $arrayElemAt: ["$writers", 0] }, type: "writer" }, null] }
          ]
        }
      },
      { $unwind: "$suggestions" },
      { $match: { "suggestions": { $ne: null } } },
      { $replaceRoot: { newRoot: "$suggestions" } },
      { $group: { _id: "$value", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { value: 1 } },
      { $limit: limit }
    ]);
    expect(mockCallback).toHaveBeenCalledWith(null, { suggestions: mockSuggestions });
  });

  test('returns empty array when no suggestions match the query', async () => {
    const query = 'nonexistent';
    const limit = 5;

    Song.aggregate.mockResolvedValue([]);

    const mockCall = { request: { query, limit } };
    const mockCallback = jest.fn();

    await searchService.Autocomplete(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, { suggestions: [] });
  });

  test('handles database query error', async () => {
    const query = 'error';
    const limit = 5;

    Song.aggregate.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { query, limit } };
    const mockCallback = jest.fn();

    await searchService.Autocomplete(mockCall, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });

  test('uses default limit when not provided', async () => {
    const mockSuggestions = [
      { value: 'Speak Now', type: 'album' },
      { value: 'Speak Now\n(Deluxe edition)', type: 'album' },
      { value: 'Speak Now World Tour – Live', type: 'album' }
    ];

    const query = 'spe';
    const defaultLimit = 5;

    Song.aggregate.mockResolvedValue(mockSuggestions);

    const mockCall = { request: { query } };
    const mockCallback = jest.fn();

    await searchService.Autocomplete(mockCall, mockCallback);

    expect(Song.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          $or: [
            { title: new RegExp(`^${query}`, 'i') },
            { artist: new RegExp(`^${query}`, 'i') },
            { album: new RegExp(`^${query}`, 'i') },
            { writers: new RegExp(`^${query}`, 'i') }
          ]
        }
      },
      {
        $project: {
          suggestions: [
            { $cond: [{ $regexMatch: { input: "$title", regex: new RegExp(`^${query}`, 'i') } }, { value: "$title", type: "title" }, null] },
            { $cond: [{ $regexMatch: { input: "$artist", regex: new RegExp(`^${query}`, 'i') } }, { value: "$artist", type: "artist" }, null] },
            { $cond: [{ $regexMatch: { input: "$album", regex: new RegExp(`^${query}`, 'i') } }, { value: "$album", type: "album" }, null] },
            { $cond: [{ $regexMatch: { input: { $arrayElemAt: ["$writers", 0] }, regex: new RegExp(`^${query}`, 'i') } }, { value: { $arrayElemAt: ["$writers", 0] }, type: "writer" }, null] }
          ]
        }
      },
      { $unwind: "$suggestions" },
      { $match: { "suggestions": { $ne: null } } },
      { $replaceRoot: { newRoot: "$suggestions" } },
      { $group: { _id: "$value", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { value: 1 } },
      { $limit: defaultLimit }
    ]);
    expect(mockCallback).toHaveBeenCalledWith(null, { suggestions: mockSuggestions });
  });
});