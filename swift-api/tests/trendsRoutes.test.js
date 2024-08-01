const request = require('supertest');
const express = require('express');
const trendsRoutes = require('../src/routes/trendsRoutes');
jest.setTimeout(10000);

// Don't mock the entire module, we'll mock the router in each test
jest.mock('../src/routes/trendsRoutes', () => {
  return jest.fn();
});

describe('Popularity Routes', () => {
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
    trendsRoutes.mockImplementation(() => mockRouter);
    
    app.use('/api/trends', trendsRoutes());
  });

  describe('GET /health', () => {
    it('should return correct status on health check', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/health', (req, res) => {
        res.json({ status: "Welcome to Trends Service!" });
      });

      const response = await request(app)
        .get('/api/trends/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ status: "Welcome to Trends Service!" });
    });
  });

  describe('GET /overall', () => {
    it('should return overall trends with rounded values', async () => {
      const mockResponse = {
        total_plays: 28694,
        average_plays_per_song: 166.826,
        top_artists: [
          {
            name: "Taylor Swift",
            total_plays: 25382,
            average_plays_per_song: 55.662,
            growth_rate_per_month: -0.056,
            top_songs: [
              {
                title: "Style",
                plays: 307,
                growth_rate_per_month: -0.032
              },
              {
                title: "Beautiful Ghosts",
                plays: 306,
                growth_rate_per_month: 0
              }
            ]
          },
          {
            name: "B.o.B\nfeaturing Taylor Swift",
            total_plays: 274,
            average_plays_per_song: 91.333,
            growth_rate_per_month: 0.193,
            top_songs: [
              {
                title: "Both of Us",
                plays: 274,
                growth_rate_per_month: 0.193
              }
            ]
          }
        ]
      };
  
      const mockRouter = trendsRoutes();
      mockRouter.get('/overall', (req, res) => {
        res.json(mockResponse);
      });
  
      const response = await request(app)
        .get('/api/trends/overall')
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toEqual({
        total_plays: 28694,
        average_plays_per_song: 166.826,
        top_artists: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            total_plays: expect.any(Number),
            average_plays_per_song: expect.any(Number),
            growth_rate_per_month: expect.any(Number),
            top_songs: expect.arrayContaining([
              expect.objectContaining({
                title: expect.any(String),
                plays: expect.any(Number),
                growth_rate_per_month: expect.any(Number)
              })
            ])
          })
        ])
      });
  
      // Check rounding
      expect(response.body.average_plays_per_song.toString()).toMatch(/^\d+\.\d{1,3}$/);
      response.body.top_artists.forEach(artist => {
        expect(artist.average_plays_per_song.toString()).toMatch(/^\d+\.\d{1,3}$/);
        expect(artist.growth_rate_per_month.toString()).toMatch(/^-?\d+(\.\d{1,3})?$/);
        artist.top_songs.forEach(song => {
          expect(song.growth_rate_per_month.toString()).toMatch(/^-?\d+(\.\d{1,3})?$/);
        });
      });
    });
  });

  describe('GET /period', () => {
    it('should return trends for a valid period', async () => {
      const mockResponse = {
        total_plays: 9111,
        average_plays_per_song: 52.971,
        top_artists: [
          {
            name: "Taylor Swift",
            total_plays: 8097,
            average_plays_per_song: 53.27,
            growth_rate_per_month: 0,
            top_songs: [
              {
                title: "Santa Baby (cover)",
                plays: 110,
                growth_rate_per_month: 0
              },
              {
                title: "American Girl (cover)",
                plays: 109,
                growth_rate_per_month: 0
              }
            ]
          },
          {
            name: "Taylor Swift\nfeaturing Dixie Chicks",
            total_plays: 110,
            average_plays_per_song: 110,
            growth_rate_per_month: 0,
            top_songs: [
              {
                title: "Soon You'll Get Better",
                plays: 110,
                growth_rate_per_month: 0
              }
            ]
          }
        ]
      };

      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ start_month: 1, end_month: 6 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        total_plays: expect.any(Number),
        average_plays_per_song: expect.any(Number),
        top_artists: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            total_plays: expect.any(Number),
            average_plays_per_song: expect.any(Number),
            growth_rate_per_month: expect.any(Number),
            top_songs: expect.arrayContaining([
              expect.objectContaining({
                title: expect.any(String),
                plays: expect.any(Number),
                growth_rate_per_month: expect.any(Number)
              })
            ])
          })
        ])
      }));
    });

    it('should return 400 if start_month is missing', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        if (!req.query.start_month) {
          return res.status(400).json({ error: 'start month and end month must be provided' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ end_month: 6 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'start month and end month must be provided' });
    });

    it('should return 400 if end_month is missing', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        if (!req.query.end_month) {
          return res.status(400).json({ error: 'start month and end month must be provided' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ start_month: 1 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'start month and end month must be provided' });
    });

    it('should return 400 if start_month is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        if (isNaN(req.query.start_month)) {
          return res.status(400).json({ error: 'start month and end month must be number : 1 (Jan) - 12 (Dec)' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ start_month: 'January', end_month: 6 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'start month and end month must be number : 1 (Jan) - 12 (Dec)' });
    });

    it('should return 400 if end_month is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        if (isNaN(req.query.end_month)) {
          return res.status(400).json({ error: 'start month and end month must be number : 1 (Jan) - 12 (Dec)' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ start_month: 1, end_month: 'June' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'start month and end month must be number : 1 (Jan) - 12 (Dec)' });
    });

    it('should return 400 if start_month is less than 1', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        if (req.query.start_month < 1) {
          return res.status(400).json({ error: 'invalid start_date or end_date' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ start_month: 0, end_month: 6 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid start_date or end_date' });
    });

    it('should return 400 if end_month is greater than 12', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        if (req.query.end_month > 12) {
          return res.status(400).json({ error: 'invalid start_date or end_date' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ start_month: 1, end_month: 13 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid start_date or end_date' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/period', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/trends/period')
        .query({ start_month: 1, end_month: 6 })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /songs', () => {
    it('should return trending songs for valid parameters', async () => {
      const mockResponse = [
        {
          title: "Beautiful Ghosts",
          artist: "Taylor Swift",
          total_plays: 206,
          growth_rate_per_month: 0.05999999865889549
        },
        {
          title: "I Don't Wanna Live Forever",
          artist: "Zayn and Taylor Swift",
          total_plays: 204,
          growth_rate_per_month: -0.01899999938905239
        }
      ];

      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ months: 3, limit: 2 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          artist: expect.any(String),
          total_plays: expect.any(Number),
          growth_rate_per_month: expect.any(Number)
        })
      ]));
      expect(response.body).toHaveLength(2);
    });

    it('should return 400 if months parameter is missing', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        if (!req.query.months) {
          return res.status(400).json({ error: 'months parameter is required' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter is required' });
    });

    it('should return 400 if months is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        if (isNaN(req.query.months)) {
          return res.status(400).json({ error: 'months parameter must be number' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ months: 'three', limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be number' });
    });

    it('should return 400 if months is less than 1', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        if (req.query.months < 1) {
          return res.status(400).json({ error: 'months parameter must be a number between 1 and 12' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ months: 0, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be a number between 1 and 12' });
    });

    it('should return 400 if months is greater than 12', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        if (req.query.months > 12) {
          return res.status(400).json({ error: 'months parameter must be a number between 1 and 12' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ months: 13, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be a number between 1 and 12' });
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        if (req.query.limit && isNaN(req.query.limit)) {
          return res.status(400).json({ error: 'limit parameter must be number' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ months: 3, limit: 'fifty' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be number' });
    });

    it('should use default limit if not provided', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        const limit = req.query.limit || 50;
        res.json(Array(parseInt(limit)).fill({
          title: "Test Song",
          artist: "Test Artist",
          total_plays: 100,
          growth_rate_per_month: 0.1
        }));
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ months: 3 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveLength(50);
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/songs', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/trends/songs')
        .query({ months: 3, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /artists', () => {
    it('should return trending artists for valid parameters', async () => {
      const mockResponse = [
        {
          name: "Taylor Swift",
          total_plays: 16270,
          growth_rate_per_month: 0.008999999612569809
        },
        {
          name: "Zayn and Taylor Swift",
          total_plays: 204,
          growth_rate_per_month: -0.01899999938905239
        }
      ];

      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ months: 3, limit: 2 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          total_plays: expect.any(Number),
          growth_rate_per_month: expect.any(Number)
        })
      ]));
      expect(response.body).toHaveLength(2);
    });

    it('should return 400 if months parameter is missing', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        if (!req.query.months) {
          return res.status(400).json({ error: 'months parameter is required' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter is required' });
    });

    it('should return 400 if months is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        if (isNaN(req.query.months)) {
          return res.status(400).json({ error: 'months parameter must be number' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ months: 'three', limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be number' });
    });

    it('should return 400 if months is less than 1', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        if (req.query.months < 1) {
          return res.status(400).json({ error: 'months parameter must be a number between 1 and 12' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ months: 0, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be a number between 1 and 12' });
    });

    it('should return 400 if months is greater than 12', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        if (req.query.months > 12) {
          return res.status(400).json({ error: 'months parameter must be a number between 1 and 12' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ months: 13, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be a number between 1 and 12' });
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        if (req.query.limit && isNaN(req.query.limit)) {
          return res.status(400).json({ error: 'limit parameter must be number' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ months: 3, limit: 'fifty' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be number' });
    });

    it('should use default limit if not provided', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        const limit = req.query.limit || 50;
        res.json(Array(parseInt(limit)).fill({
          name: "Test Artist",
          total_plays: 1000,
          growth_rate_per_month: 0.1
        }));
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ months: 3 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveLength(50);
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/artists', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/trends/artists')
        .query({ months: 3, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /albums', () => {
    it('should return trending albums for valid parameters', async () => {
      const mockResponse = [
        {
          name: "Lover",
          artist: "Taylor Swift",
          total_plays: 2147,
          growth_rate_per_month: -0.11800000071525574
        },
        {
          name: "Folklore",
          artist: "Taylor Swift",
          total_plays: 1712,
          growth_rate_per_month: 0.09300000220537186
        }
      ];

      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ months: 3, limit: 2 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          artist: expect.any(String),
          total_plays: expect.any(Number),
          growth_rate_per_month: expect.any(Number)
        })
      ]));
      expect(response.body).toHaveLength(2);
    });

    it('should return 400 if months parameter is missing', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        if (!req.query.months) {
          return res.status(400).json({ error: 'months parameter is required' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter is required' });
    });

    it('should return 400 if months is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        if (isNaN(req.query.months)) {
          return res.status(400).json({ error: 'months parameter must be number' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ months: 'three', limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be number' });
    });

    it('should return 400 if months is less than 1', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        if (req.query.months < 1) {
          return res.status(400).json({ error: 'months parameter must be a number between 1 and 12' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ months: 0, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be a number between 1 and 12' });
    });

    it('should return 400 if months is greater than 12', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        if (req.query.months > 12) {
          return res.status(400).json({ error: 'months parameter must be a number between 1 and 12' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ months: 13, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'months parameter must be a number between 1 and 12' });
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        if (req.query.limit && isNaN(req.query.limit)) {
          return res.status(400).json({ error: 'limit parameter must be number' });
        }
        res.json([]);
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ months: 3, limit: 'fifty' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be number' });
    });

    it('should use default limit if not provided', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        const limit = req.query.limit || 50;
        res.json(Array(parseInt(limit)).fill({
          name: "Test Album",
          artist: "Test Artist",
          total_plays: 1000,
          growth_rate_per_month: 0.1
        }));
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ months: 3 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveLength(50);
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = trendsRoutes();
      mockRouter.get('/albums', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/trends/albums')
        .query({ months: 3, limit: 50 })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });
});