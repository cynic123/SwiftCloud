// File: services/songs-service/tests/songs-service.test.js
const songsService = require('../src/songs-service');
const { Song } = require('../src/db');

// Mock the Song model
jest.mock('../src/db', () => ({
  Song: {
    find: jest.fn()
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
    // Add other status codes as needed
  },
}));

// HealthCheck
describe('Songs Service - Get HealthCheck', () => {
  test('HealthCheck returns correct status', async () => {
    const mockCallback = jest.fn();
    await songsService.HealthCheck(null, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, { status: 'Welcome to Songs Service!' });
  });
});

// GetSongsByYear
describe('Songs Service - GetSongsByYear', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves songs for a given year', async () => {
    const mockSongs = [
      { id: '1', title: 'Song 1', artist: 'Artist 1', year: 2017 },
      { id: '2', title: 'Song 2', artist: 'Artist 2', year: 2017 }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { year: '2017' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByYear(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ year: 2017 });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockSongs });
  });

  test('returns empty array for a year with no songs', async () => {
    Song.find.mockResolvedValue([]);

    const mockCall = { request: { year: '1960' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByYear(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ year: 1960 });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: [] });
  });

  test('handles database query error', async () => {
    Song.find.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { year: '2017' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByYear(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ year: 2017 });
    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });
});

// GetSongsByArtist
describe('Songs Service - GetSongsByArtist', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves songs for a given artist', async () => {
    const mockSongs = [
      {
        id: '66a3b0706c7ceb4c62679019',
        title: 'Babe',
        artist: 'Sugarland\nfeaturing Taylor Swift',
        album: 'Bigger',
        year: 2018,
        writers: ['Taylor Swift', 'Patrick Monahan'],
        plays: [
          { month: 'June', count: 19 },
          { month: 'July', count: 22 },
          { month: 'August', count: 7 }
        ]
      }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { artist: 'Sugarland' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByArtist(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ artist: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockSongs });
  });

  test('handles partial artist name match', async () => {
    const mockSongs = [
      { id: '1', title: 'Song 1', artist: 'Sugarland featuring Someone' },
      { id: '2', title: 'Song 2', artist: 'Sugar Ray' }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { artist: 'Sugar' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByArtist(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ artist: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockSongs });
  });

  test('handles case-insensitive artist name match', async () => {
    const mockSongs = [
      { id: '1', title: 'Song 1', artist: 'SUGARLAND' },
      { id: '2', title: 'Song 2', artist: 'sugarland' }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { artist: 'SuGaRlAnD' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByArtist(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ artist: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockSongs });
  });

  test('returns empty array when no songs found for the artist', async () => {
    Song.find.mockResolvedValue([]);

    const mockCall = { request: { artist: 'NonexistentArtist' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByArtist(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ artist: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: [] });
  });

  test('handles database query error', async () => {
    Song.find.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { artist: 'Sugarland' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByArtist(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ artist: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });
});

//GetSongsByWriter
describe('Songs Service - GetSongsByWriter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves songs for a given writer (partial match)', async () => {
    const mockSongs = [
      {
        _id: '66a8b1d88d8b930120e6a6b8',
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
      },
      {
        _id: '66a8b1d88d8b930120e6a6bb',
        title: 'All You Had to Do Was Stay',
        artist: 'Taylor Swift',
        writers: ['Taylor Swift', 'Max Martin'],
        album: '1989',
        year: 2014,
        plays: [
          { month: 'June', count: 78 },
          { month: 'July', count: 78 },
          { month: 'August', count: 97 }
        ]
      }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { writer: 'Max' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByWriter(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ writers: { $regex: expect.any(RegExp) } });
    expect(mockCallback).toHaveBeenCalledWith(null, {
      songs: expect.arrayContaining([
        expect.objectContaining({
          id: '66a8b1d88d8b930120e6a6b8',
          title: '22',
          artist: 'Taylor Swift',
          writers: ['Taylor Swift', 'Max Martin', 'Shellback'],
          album: 'Red',
          year: 2012,
          plays: expect.arrayContaining([
            expect.objectContaining({ month: 'June', count: 27 }),
            expect.objectContaining({ month: 'July', count: 30 }),
            expect.objectContaining({ month: 'August', count: 32 })
          ])
        }),
        expect.objectContaining({
          id: '66a8b1d88d8b930120e6a6bb',
          title: 'All You Had to Do Was Stay',
          artist: 'Taylor Swift',
          writers: ['Taylor Swift', 'Max Martin'],
          album: '1989',
          year: 2014,
          plays: expect.arrayContaining([
            expect.objectContaining({ month: 'June', count: 78 }),
            expect.objectContaining({ month: 'July', count: 78 }),
            expect.objectContaining({ month: 'August', count: 97 })
          ])
        })
      ])
    });
  });

  test('handles case-insensitive writer name match', async () => {
    const mockSongs = [
      {
        _id: '66a8b1d88d8b930120e6a6b8',
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
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { writer: 'mAx MaRtIn' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByWriter(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ writers: { $regex: expect.any(RegExp) } });
    expect(mockCallback).toHaveBeenCalledWith(null, {
      songs: expect.arrayContaining([
        expect.objectContaining({
          id: '66a8b1d88d8b930120e6a6b8',
          title: '22',
          artist: 'Taylor Swift',
          writers: ['Taylor Swift', 'Max Martin', 'Shellback'],
          album: 'Red',
          year: 2012
        })
      ])
    });
  });

  test('returns empty array when no songs found for the writer', async () => {
    Song.find.mockResolvedValue([]);

    const mockCall = { request: { writer: 'NonexistentWriter' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByWriter(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ writers: { $regex: expect.any(RegExp) } });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: [] });
  });

  test('handles database query error', async () => {
    Song.find.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { writer: 'Max Martin' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByWriter(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ writers: { $regex: expect.any(RegExp) } });
    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });
});

// GetSongsByAlbum
describe('Songs Service - GetSongsByAlbum', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves songs for a given album (partial match)', async () => {
    const mockSongs = [
      {
        id: '66a8b1d88d8b930120e6a6c0',
        title: 'Back to December',
        artist: 'Taylor Swift',
        writers: ['Taylor Swift'],
        album: 'Speak Now',
        year: 2010,
        plays: [
          { month: 'June', count: 50 },
          { month: 'July', count: 38 },
          { month: 'August', count: 63 }
        ]
      },
      {
        id: '66a8b1d88d8b930120e6a6c8',
        title: 'Better than Revenge',
        artist: 'Taylor Swift',
        writers: ['Taylor Swift'],
        album: 'Speak Now',
        year: 2010,
        plays: [
          { month: 'June', count: 5 },
          { month: 'July', count: 110 },
          { month: 'August', count: 71 }
        ]
      }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { album: 'Speak' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByAlbum(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ album: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockSongs });
  });

  test('handles case-insensitive album name match', async () => {
    const mockSongs = [
      {
        id: '66a8b1d88d8b930120e6a6c0',
        title: 'Back to December',
        artist: 'Taylor Swift',
        album: 'Speak Now',
        year: 2010
      }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { album: 'sPeAk NoW' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByAlbum(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ album: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockSongs });
  });

  test('returns empty array when no songs found for the album', async () => {
    Song.find.mockResolvedValue([]);

    const mockCall = { request: { album: 'NonexistentAlbum' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByAlbum(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ album: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: [] });
  });

  test('handles database query error', async () => {
    Song.find.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { album: 'Speak Now' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByAlbum(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ album: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });

  test('retrieves songs with album names containing spaces', async () => {
    const mockSongs = [
      {
        id: '66a8b1d88d8b930120e6a6c7',
        title: 'Bette Davis Eyes (live cover)',
        artist: 'Taylor Swift',
        album: 'Speak Now World Tour – Live',
        year: 2011
      }
    ];
    Song.find.mockResolvedValue(mockSongs);

    const mockCall = { request: { album: 'World Tour' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByAlbum(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ album: expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: mockSongs });
  });
});

// GetSongsByMonth
describe('Songs Service - GetSongsByMonth', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('successfully retrieves songs for a given month (case-insensitive match)', async () => {
    const mockSongs = [
      {
        id: '66a8b1d88d8b930120e6a6c0',
        title: 'Back to December',
        artist: 'Taylor Swift',
        writers: ['Taylor Swift'],
        album: 'Speak Now',
        year: 2010,
        plays: [
          { month: 'June', count: 50 },
          { month: 'July', count: 38 },
          { month: 'August', count: 63 }
        ]
      },
      {
        id: '66a8b1d88d8b930120e6a6c8',
        title: 'Better than Revenge',
        artist: 'Taylor Swift',
        writers: ['Taylor Swift'],
        album: 'Speak Now',
        year: 2010,
        plays: [
          { month: 'June', count: 5 },
          { month: 'July', count: 110 },
          { month: 'August', count: 71 }
        ]
      }
    ];
  
    Song.find.mockResolvedValue(mockSongs);
  
    const mockCall = { request: { month: 'aUgust' } };
    const mockCallback = jest.fn();
  
    await songsService.GetSongsByMonth(mockCall, mockCallback);
  
    expect(Song.find).toHaveBeenCalledWith({ 'plays.month': expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, {
      songs: [
        {
          plays: [{ month: 'August', count: 63 }]
        },
        {
          plays: [{ month: 'August', count: 71 }]
        }
      ]
    });
  });

  test('returns empty array when no songs found for the month', async () => {
    Song.find.mockResolvedValue([]);

    const mockCall = { request: { month: 'December' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByMonth(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ 'plays.month': expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith(null, { songs: [] });
  });

  test('handles database query error', async () => {
    Song.find.mockRejectedValue(new Error('Database error'));

    const mockCall = { request: { month: 'August' } };
    const mockCallback = jest.fn();

    await songsService.GetSongsByMonth(mockCall, mockCallback);

    expect(Song.find).toHaveBeenCalledWith({ 'plays.month': expect.any(RegExp) });
    expect(mockCallback).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL'
    });
  });
});

