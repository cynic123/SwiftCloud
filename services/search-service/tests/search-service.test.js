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

describe('Search Service - Health Check', () => {
  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await searchService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Search Service!' });
  });
});

// Advanced Search
describe('Search Service - Advanced Search', () => {
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

  test('uses default sorting when limit and offset are not provided in advanced search', async () => {
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
      // Add more mock songs if needed
    ];
  
    Song.aggregate.mockResolvedValue(mockSongs);
    Song.countDocuments.mockResolvedValue(mockSongs.length);
  
    const mockCall = { request: { query: 'Max Martin', filters: [], sort: {} } };
    const mockCallback = jest.fn();
  
    await searchService.AdvancedSearch(mockCall, mockCallback);
  
    // Check if aggregate was called with the correct pipeline
    expect(Song.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ $match: expect.any(Object) }),
        expect.objectContaining({ $addFields: expect.any(Object) }),
        expect.objectContaining({ $sort: { relevance_score: -1 } }),
        expect.objectContaining({ $skip: undefined }),
        expect.objectContaining({ $limit: undefined })
      ])
    );
  
    // Check if the callback was called with the correct structure
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        results: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            artist: expect.any(String),
            writers: expect.any(Array),
            album: expect.any(String),
            year: expect.any(Number),
            plays: expect.any(Array),
            relevance_score: expect.any(Number)
          })
        ]),
        total_results: mockSongs.length
      })
    );
  });
});

// Autocomplete Service
describe('Search Service - Autocomplete', () => {
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