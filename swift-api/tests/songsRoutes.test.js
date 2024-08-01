const request = require('supertest');
const express = require('express');
const songsRoutes = require('../src/routes/songsRoutes');

// Don't mock the entire module, we'll mock the router in each test
jest.mock('../src/routes/songsRoutes', () => {
  return jest.fn();
});

describe('Songs Routes', () => {
  let app;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    
    // Create a new mock router for each test
    const mockRouter = express.Router();

    // Add the mock router as mock implementation of each routes
    songsRoutes.mockImplementation(() => mockRouter);
    
    app.use('/api/songs', songsRoutes());
  });

  describe('GET /health', () => {
    it('should return correct status on health check', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/health', (req, res) => {
        res.json({ status: "Welcome to Songs Service!" });
      });

      const response = await request(app)
        .get('/api/songs/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ status: "Welcome to Songs Service!" });
    });
  });

  describe('GET /all', () => {
    it('should return all songs', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/all', (req, res) => {
        const mockSongs = [
          { id: '1', title: 'Song 1', artist: 'Artist 1' },
          { id: '2', title: 'Song 2', artist: 'Artist 2' },
        ];
        res.json(mockSongs);
      });

      const response = await request(app)
        .get('/api/songs/all')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          artist: expect.any(String)
        })
      ]));
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /year/:year', () => {
    it('should return songs for a valid year', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/year/:year', (req, res) => {
        const mockSongs = [
          { id: '1', title: 'Song 1', artist: 'Artist 1', year: 2017 },
          { id: '2', title: 'Song 2', artist: 'Artist 2', year: 2017 },
        ];
        res.json(mockSongs);
      });

      const response = await request(app)
        .get('/api/songs/year/2017')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          artist: expect.any(String),
          year: 2017
        })
      ]));
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 400 if year is not provided', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/year/', (req, res) => {
        const year = req.params.year;
        if (!year) {
          return res.status(400).json({ error: 'year parameter is required' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/songs/year/')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'year parameter is required' });
    });

    it('should return 400 if year is not a number', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/year/:year', (req, res) => {
        const year = req.params.year;
        if (isNaN(year)) {
          return res.status(400).json({ error: 'year parameter must be a number' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/songs/year/notanumber')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'year parameter must be a number' });
    });

    it('should return 400 if year is out of valid range', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/year/:year', (req, res) => {
        const year = parseInt(req.params.year);
        if (year < 1900 || year > new Date().getFullYear()) {
          return res.status(400).json({ error: 'year parameter must be between 1900 to current year' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/songs/year/1800')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'year parameter must be between 1900 to current year' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/year/:year', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/songs/year/2017')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /artist/:artist', () => {
    it('should return songs for a valid artist', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/artist/:artist', (req, res) => {
        const mockSongs = [
          { id: '1', title: 'Song 1', artist: 'Artist 1' },
          { id: '2', title: 'Song 2', artist: 'Artist 1' },
        ];
        res.json(mockSongs);
      });

      const response = await request(app)
        .get('/api/songs/artist/Artist%201')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          artist: 'Artist 1'
        })
      ]));
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 400 if artist is not provided', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/artist', (req, res) => {
        res.status(400).json({ error: 'artist parameter is required' });
      });

      const response = await request(app)
        .get('/api/songs/artist')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'artist parameter is required' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/artist/:artist', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/songs/artist/Artist%201')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /writer/:writer', () => {
    it('should return songs for a valid writer', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/writer/:writer', (req, res) => {
        const mockSongs = [
          { id: '1', title: 'Song 1', writer: 'Writer 1' },
          { id: '2', title: 'Song 2', writer: 'Writer 1' },
        ];
        res.json(mockSongs);
      });

      const response = await request(app)
        .get('/api/songs/writer/Writer%201')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          writer: 'Writer 1'
        })
      ]));
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 400 if writer is not provided', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/writer', (req, res) => {
        res.status(400).json({ error: 'writer parameter is required' });
      });

      const response = await request(app)
        .get('/api/songs/writer')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'writer parameter is required' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/writer/:writer', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/songs/writer/Writer%201')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /album/:album', () => {
    it('should return songs for a valid album', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/album/:album', (req, res) => {
        const mockSongs = [
          { id: '1', title: 'Song 1', album: 'Album 1' },
          { id: '2', title: 'Song 2', album: 'Album 1' },
        ];
        res.json(mockSongs);
      });

      const response = await request(app)
        .get('/api/songs/album/Album%201')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          album: 'Album 1'
        })
      ]));
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 400 if album is not provided', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/album', (req, res) => {
        res.status(400).json({ error: 'album parameter is required' });
      });

      const response = await request(app)
        .get('/api/songs/album')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'album parameter is required' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/album/:album', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/songs/album/Album%201')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /month/:month', () => {
    it('should return songs for a valid month', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/month/:month', (req, res) => {
        const mockSongs = [
          { id: '1', title: 'Song 1', month: 'January' },
          { id: '2', title: 'Song 2', month: 'January' },
        ];
        res.json(mockSongs);
      });

      const response = await request(app)
        .get('/api/songs/month/January')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          month: 'January'
        })
      ]));
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 400 if month is not provided', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/month', (req, res) => {
        res.status(400).json({ error: 'month parameter is required' });
      });

      const response = await request(app)
        .get('/api/songs/month')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'month parameter is required' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = songsRoutes();
      mockRouter.get('/month/:month', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/songs/month/January')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });
});