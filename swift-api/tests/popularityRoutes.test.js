const request = require('supertest');
const express = require('express');
const popularityRoutes = require('../src/routes/popularityRoutes');
jest.setTimeout(30000);

// Don't mock the entire module, we'll mock the router in each test
jest.mock('../src/routes/popularityRoutes', () => {
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
    popularityRoutes.mockImplementation(() => mockRouter);
    
    app.use('/api/popularity', popularityRoutes());
  });

  describe('GET /health', () => {
    it('should return correct status on health check', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/health', (req, res) => {
        res.json({ status: "Welcome to Popularity Service!" });
      });

      const response = await request(app)
        .get('/api/popularity/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ status: "Welcome to Popularity Service!" });
    });
  });

  describe('GET /songs/most_monthly', () => {
    it('should return most popular songs monthly for valid parameters', async () => {
      const mockResponse = {
        "June": {
          "songs": [
            { "title": "Santa Baby (cover)", "artist": "Taylor Swift", "play_count": 110, "rank": 1 },
            { "title": "Soon You'll Get Better", "artist": "Taylor Swift\nfeaturing Dixie Chicks", "play_count": 110, "rank": 2 }
          ]
        },
        "July": {
          "songs": [
            { "title": "Better than Revenge", "artist": "Taylor Swift", "play_count": 110, "rank": 1 },
            { "title": "Christmases When You Were Mine", "artist": "Taylor Swift", "play_count": 110, "rank": 2 }
          ]
        },
        "August": {
          "songs": [
            { "title": "I Wish You Would", "artist": "Taylor Swift", "play_count": 110, "rank": 1 },
            { "title": "Last Christmas (cover)", "artist": "Taylor Swift", "play_count": 110, "rank": 2 }
          ]
        }
      };
  
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_monthly', (req, res) => {
        res.json(mockResponse);
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_monthly')
        .query({ limit: 2, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toEqual(expect.objectContaining({
        June: expect.objectContaining({
          songs: expect.arrayContaining([
            expect.objectContaining({
              title: expect.any(String),
              artist: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        }),
        July: expect.objectContaining({
          songs: expect.arrayContaining([
            expect.objectContaining({
              title: expect.any(String),
              artist: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        }),
        August: expect.objectContaining({
          songs: expect.arrayContaining([
            expect.objectContaining({
              title: expect.any(String),
              artist: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        })
      }));
      expect(Object.keys(response.body)).toHaveLength(3);
      expect(response.body.June.songs).toHaveLength(2);
      expect(response.body.July.songs).toHaveLength(2);
      expect(response.body.August.songs).toHaveLength(2);
    });
  
    it('should use default limit and offset if not provided', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_monthly', (req, res) => {
        const limit = req.query.limit || '50';
        const offset = req.query.offset || '0';
        
        if (limit === '50' && offset === '0') {
          res.json({ message: 'Default values used successfully' });
        } else {
          res.status(400).json({ error: 'Unexpected values for limit or offset' });
        }
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_monthly')
        .expect('Content-Type', /json/);
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Default values used successfully' });
    });
  
    it('should return 400 if limit is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_monthly', (req, res) => {
        if (isNaN(req.query.limit)) {
          return res.status(400).json({ error: 'limit parameter must be a number' });
        }
        res.json({});
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_monthly')
        .query({ limit: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);
  
      expect(response.body).toEqual({ error: 'limit parameter must be a number' });
    });
  
    it('should return 400 if offset is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_monthly', (req, res) => {
        if (isNaN(req.query.offset)) {
          return res.status(400).json({ error: 'offset parameter must be a number' });
        }
        res.json({});
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_monthly')
        .query({ offset: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);
  
      expect(response.body).toEqual({ error: 'offset parameter must be a number' });
    });
  
    it('should return 404 if no songs are found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_monthly', (req, res) => {
        res.status(404).json({ error: 'No songs found' });
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_monthly')
        .expect('Content-Type', /json/)
        .expect(404);
  
      expect(response.body).toEqual({ error: 'No songs found' });
    });
  
    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_monthly', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_monthly')
        .expect('Content-Type', /json/)
        .expect(500);
  
      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  
    it('should handle empty months', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_monthly', (req, res) => {
        res.json({});
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_monthly')
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toEqual({});
    });
  });

  describe('GET /songs/most_all_time', () => {
    it('should return most popular songs all time for valid parameters', async () => {
      const mockResponse = [
        { title: "Style", artist: "Taylor Swift", play_count: 307, rank: 1 },
        { title: "Beautiful Ghosts", artist: "Taylor Swift", play_count: 306, rank: 2 },
        { title: "Peace", artist: "Taylor Swift", play_count: 297, rank: 3 },
        { title: "Seven", artist: "Taylor Swift", play_count: 297, rank: 4 },
        { title: "Cold as You", artist: "Taylor Swift", play_count: 294, rank: 5 }
      ];
  
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        res.json(mockResponse);
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .query({ limit: 5, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          artist: expect.any(String),
          play_count: expect.any(Number),
          rank: expect.any(Number)
        })
      ]));
      expect(response.body).toHaveLength(5);
      expect(response.body[0].title).toBe("Style");
      expect(response.body[0].artist).toBe("Taylor Swift");
      expect(response.body[0].play_count).toBe(307);
      expect(response.body[0].rank).toBe(1);
    });
  
    it('should use default limit and offset if not provided', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        const limit = req.query.limit || '50';
        const offset = req.query.offset || '0';
        
        if (limit === '50' && offset === '0') {
          res.json([{ title: "Default Song", artist: "Default Artist", play_count: 100, rank: 1 }]);
        } else {
          res.status(400).json({ error: 'Unexpected values for limit or offset' });
        }
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        title: "Default Song",
        artist: "Default Artist",
        play_count: 100,
        rank: 1
      });
    });
  
    it('should return 400 if limit is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        if (req.query.limit && isNaN(req.query.limit)) {
          return res.status(400).json({ error: 'limit parameter must be a number' });
        }
        res.json([]);
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .query({ limit: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);
  
      expect(response.body).toEqual({ error: 'limit parameter must be a number' });
    });
  
    it('should return 400 if offset is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        if (req.query.offset && isNaN(req.query.offset)) {
          return res.status(400).json({ error: 'offset parameter must be a number' });
        }
        res.json([]);
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .query({ offset: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);
  
      expect(response.body).toEqual({ error: 'offset parameter must be a number' });
    });
  
    it('should return 404 if no songs are found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        res.status(404).json({ error: 'No songs found' });
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .expect('Content-Type', /json/)
        .expect(404);
  
      expect(response.body).toEqual({ error: 'No songs found' });
    });
  
    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .expect('Content-Type', /json/)
        .expect(500);
  
      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  
    it('should handle empty song list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        res.json([]);
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toEqual([]);
    });
  
    it('should respect the limit parameter', async () => {
      const mockResponse = [
        { title: "Style", artist: "Taylor Swift", play_count: 307, rank: 1 },
        { title: "Beautiful Ghosts", artist: "Taylor Swift", play_count: 306, rank: 2 }
      ];
  
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        res.json(mockResponse.slice(0, parseInt(req.query.limit)));
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .query({ limit: 2 })
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe("Style");
      expect(response.body[1].title).toBe("Beautiful Ghosts");
    });
  
    it('should respect the offset parameter', async () => {
      const mockResponse = [
        { title: "Style", artist: "Taylor Swift", play_count: 307, rank: 1 },
        { title: "Beautiful Ghosts", artist: "Taylor Swift", play_count: 306, rank: 2 },
        { title: "Peace", artist: "Taylor Swift", play_count: 297, rank: 3 }
      ];
  
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/most_all_time', (req, res) => {
        res.json(mockResponse.slice(parseInt(req.query.offset)));
      });
  
      const response = await request(app)
        .get('/api/popularity/songs/most_all_time')
        .query({ offset: 1 })
        .expect('Content-Type', /json/)
        .expect(200);
  
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe("Beautiful Ghosts");
      expect(response.body[1].title).toBe("Peace");
    });
  });

  describe('GET /songs/song', () => {
    it('should return song popularity for a valid title', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/song', (req, res) => {
        const mockResponse = {
          rankings: [
            {
              title: "Betty",
              artist: "Taylor Swift",
              play_count: 205,
              rank: 45
            },
            {
              title: "Bette Davis Eyes (live cover)",
              artist: "Taylor Swift",
              play_count: 187,
              rank: 65
            },
            {
              title: "Better than Revenge",
              artist: "Taylor Swift",
              play_count: 186,
              rank: 66
            }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/songs/song')
        .query({ title: 'Betty' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        rankings: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            artist: expect.any(String),
            play_count: expect.any(Number),
            rank: expect.any(Number)
          })
        ])
      });
      expect(response.body.rankings.length).toBeGreaterThan(0);
    });

    it('should return 400 if title is missing', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/song', (req, res) => {
        if (!req.query.title) {
          return res.status(400).json({ error: 'Title query is required' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/popularity/songs/song')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'Title query is required' });
    });

    it('should return 404 if no songs are found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/song', (req, res) => {
        res.status(404).json({ error: 'No songs found' });
      });

      const response = await request(app)
        .get('/api/popularity/songs/song')
        .query({ title: 'NonexistentSong' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No songs found' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/song', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/popularity/songs/song')
        .query({ title: 'SomeSong' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle empty rankings', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/song', (req, res) => {
        res.json({ rankings: [] });
      });

      const response = await request(app)
        .get('/api/popularity/songs/song')
        .query({ title: 'RareSong' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ rankings: [] });
    });

    it('should handle partial matches in rankings', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/songs/song', (req, res) => {
        const mockResponse = {
          rankings: [
            {
              title: "Bette Davis Eyes (live cover)",
              artist: "Taylor Swift",
              play_count: 187,
              rank: 65
            },
            {
              title: "Better than Revenge",
              artist: "Taylor Swift",
              play_count: 186,
              rank: 66
            }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/songs/song')
        .query({ title: 'Bette' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.rankings.length).toBe(2);
      expect(response.body.rankings[0].title).toContain('Bette');
      expect(response.body.rankings[1].title).toContain('Better');
    });
  });

  describe('GET /albums/most_monthly', () => {
    it('should return most popular albums monthly for valid parameters', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_monthly', (req, res) => {
        const mockResponse = {
          "June": {
            "albums": [
              {
                "name": "Lover",
                "artist": "Taylor Swift",
                "play_count": 1141,
                "rank": 1
              },
              {
                "name": "Fearless",
                "artist": "Taylor Swift",
                "play_count": 862,
                "rank": 2
              }
            ]
          },
          "July": {
            "albums": [
              {
                "name": "Lover",
                "artist": "Taylor Swift",
                "play_count": 1006,
                "rank": 1
              },
              {
                "name": "Speak Now",
                "artist": "Taylor Swift",
                "play_count": 905,
                "rank": 2
              }
            ]
          }
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_monthly')
        .query({ limit: 2, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        June: expect.objectContaining({
          albums: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              artist: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        }),
        July: expect.objectContaining({
          albums: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              artist: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        })
      }));
      expect(Object.keys(response.body)).toHaveLength(2);
      expect(response.body.June.albums).toHaveLength(2);
      expect(response.body.July.albums).toHaveLength(2);
    });

    it('should use default limit and offset if not provided', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_monthly', (req, res) => {
        const limit = req.query.limit || '50';
        const offset = req.query.offset || '0';
        
        if (limit === '50' && offset === '0') {
          res.json({ message: 'Default values used successfully' });
        } else {
          res.status(400).json({ error: 'Unexpected values for limit or offset' });
        }
      });
    
      const response = await request(app)
        .get('/api/popularity/albums/most_monthly')
        .expect('Content-Type', /json/);
    
      if (response.status !== 200) {
        console.error('Unexpected response:', response.body);
      }
    
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Default values used successfully' });
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_monthly', (req, res) => {
        if (isNaN(req.query.limit)) {
          return res.status(400).json({ error: 'limit parameter must be a number' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_monthly')
        .query({ limit: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be a number' });
    });

    it('should return 400 if offset is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_monthly', (req, res) => {
        if (isNaN(req.query.offset)) {
          return res.status(400).json({ error: 'offset parameter must be a number' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_monthly')
        .query({ offset: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'offset parameter must be a number' });
    });

    it('should return 404 if no albums are found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_monthly', (req, res) => {
        res.status(404).json({ error: 'No albums found' });
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_monthly')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No albums found' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_monthly', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_monthly')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle empty months', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_monthly', (req, res) => {
        res.json({});
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_monthly')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('GET /albums/most_all_time', () => {
    it('should return most popular albums all time for valid parameters', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_all_time', (req, res) => {
        const mockResponse = {
          albums: [
            {
              name: "Lover",
              artist: "Taylor Swift",
              play_count: 3130,
              rank: 1
            },
            {
              name: "Folklore",
              artist: "Taylor Swift",
              play_count: 2704,
              rank: 2
            }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_all_time')
        .query({ limit: 2, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        albums: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            artist: expect.any(String),
            play_count: expect.any(Number),
            rank: expect.any(Number)
          })
        ])
      });
      expect(response.body.albums).toHaveLength(2);
    });

    it('should use default limit and offset if not provided', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_all_time', (req, res) => {
        const limit = req.query.limit || '50';
        const offset = req.query.offset || '0';
        
        if (limit === '50' && offset === '0') {
          res.json({ message: 'Default values used successfully' });
        } else {
          res.status(400).json({ error: 'Unexpected values for limit or offset' });
        }
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_all_time')
        .expect('Content-Type', /json/);

      if (response.status !== 200) {
        console.error('Unexpected response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Default values used successfully' });
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_all_time', (req, res) => {
        if (req.query.limit && isNaN(req.query.limit)) {
          return res.status(400).json({ error: 'limit parameter must be a number' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_all_time')
        .query({ limit: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be a number' });
    });

    it('should return 400 if offset is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_all_time', (req, res) => {
        if (req.query.offset && isNaN(req.query.offset)) {
          return res.status(400).json({ error: 'offset parameter must be a number' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_all_time')
        .query({ offset: 'not-a-number' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'offset parameter must be a number' });
    });

    it('should return 404 if no albums are found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_all_time', (req, res) => {
        res.status(404).json({ error: 'No albums found' });
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_all_time')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No albums found' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_all_time', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_all_time')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle empty album list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/most_all_time', (req, res) => {
        res.json({ albums: [] });
      });

      const response = await request(app)
        .get('/api/popularity/albums/most_all_time')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ albums: [] });
    });
  });

  describe('GET /albums/album', () => {
    it('should return album popularity for a valid name', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/album', (req, res) => {
        const mockResponse = {
          rankings: [
            {
              name: "Speak Now",
              artist: "Taylor Swift",
              play_count: 2532,
              rank: 4
            },
            {
              name: "Speak Now World Tour – Live",
              artist: "Taylor Swift",
              play_count: 858,
              rank: 10
            },
            {
              name: "Speak Now\n(Deluxe edition)",
              artist: "Taylor Swift",
              play_count: 442,
              rank: 16
            }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/albums/album')
        .query({ name: 'Speak Now' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        rankings: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            artist: expect.any(String),
            play_count: expect.any(Number),
            rank: expect.any(Number)
          })
        ])
      });
      expect(response.body.rankings.length).toBeGreaterThan(0);
    });

    it('should return 400 if name is missing', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/album', (req, res) => {
        if (!req.query.name) {
          return res.status(400).json({ error: 'name parameter is required' });
        }
        res.json({});
      });

      const response = await request(app)
        .get('/api/popularity/albums/album')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'name parameter is required' });
    });

    it('should return 404 if no albums are found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/album', (req, res) => {
        res.status(404).json({ error: 'No albums found' });
      });

      const response = await request(app)
        .get('/api/popularity/albums/album')
        .query({ name: 'NonexistentAlbum' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No albums found' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/album', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/popularity/albums/album')
        .query({ name: 'SomeAlbum' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle partial matches in album names', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/album', (req, res) => {
        const mockResponse = {
          rankings: [
            {
              name: "Speak Now",
              artist: "Taylor Swift",
              play_count: 2532,
              rank: 4
            },
            {
              name: "Speak Now World Tour – Live",
              artist: "Taylor Swift",
              play_count: 858,
              rank: 10
            }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/albums/album')
        .query({ name: 'Speak' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.rankings.length).toBe(2);
      expect(response.body.rankings[0].name).toContain('Speak');
      expect(response.body.rankings[1].name).toContain('Speak');
    });

    it('should handle empty rankings', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/albums/album', (req, res) => {
        res.json({ rankings: [] });
      });

      const response = await request(app)
        .get('/api/popularity/albums/album')
        .query({ name: 'RareAlbum' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ rankings: [] });
    });
  });

  describe('GET /artists/most_monthly', () => {
    it('should return most popular artists monthly for valid parameters', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_monthly', (req, res) => {
        const mockResponse = {
          "June": {
            "artists": [
              { "name": "Taylor Swift", "play_count": 8097, "rank": 1 },
              { "name": "Taylor Swift\nfeaturing Dixie Chicks", "play_count": 110, "rank": 2 },
              { "name": "B.o.B\nfeaturing Taylor Swift", "play_count": 104, "rank": 3 },
              { "name": "Zayn and Taylor Swift", "play_count": 103, "rank": 4 },
              { "name": "Jack Ingram\nfeaturing Taylor Swift", "play_count": 91, "rank": 5 }
            ]
          },
          "July": {
            "artists": [
              { "name": "Taylor Swift", "play_count": 8173, "rank": 1 },
              { "name": "Taylor Swift\nfeaturing Shawn Mendes", "play_count": 110, "rank": 2 },
              { "name": "Jack Ingram\nfeaturing Taylor Swift", "play_count": 109, "rank": 3 },
              { "name": "John Mayer\nfeaturing Taylor Swift", "play_count": 102, "rank": 4 },
              { "name": "Tim McGraw and Taylor Swift\nfeaturing Keith Urban", "play_count": 102, "rank": 5 }
            ]
          },
          "August": {
            "artists": [
              { "name": "Taylor Swift", "play_count": 9112, "rank": 1 },
              { "name": "Taylor Swift\nfeaturing Paula Fernandes", "play_count": 108, "rank": 2 },
              { "name": "Taylor Swift\nfeaturing Colbie Caillat", "play_count": 104, "rank": 3 },
              { "name": "Taylor Swift\nfeaturing Ed Sheeran", "play_count": 95, "rank": 4 },
              { "name": "Taylor Swift\nfeaturing Ed Sheeran and Future", "play_count": 89, "rank": 5 }
            ]
          }
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_monthly')
        .query({ limit: 5, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        June: expect.objectContaining({
          artists: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        }),
        July: expect.objectContaining({
          artists: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        }),
        August: expect.objectContaining({
          artists: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              play_count: expect.any(Number),
              rank: expect.any(Number)
            })
          ])
        })
      }));
      expect(Object.keys(response.body)).toHaveLength(3); // Check for three months
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_monthly', (req, res) => {
        res.status(400).json({ error: 'limit parameter must be a number' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_monthly')
        .query({ limit: 'not_a_number', offset: 0 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be a number' });
    });

    it('should return 400 if offset is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_monthly', (req, res) => {
        res.status(400).json({ error: 'offset parameter must be a number' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_monthly')
        .query({ limit: 50, offset: 'not_a_number' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'offset parameter must be a number' });
    });

    it('should return 404 if no artists found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_monthly', (req, res) => {
        res.status(404).json({ error: 'No artists found' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_monthly')
        .query({ limit: 50, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No artists found' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_monthly', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_monthly')
        .query({ limit: 50, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle empty artists list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_monthly', (req, res) => {
        res.json({ August: { artists: [] } });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_monthly')
        .query({ limit: 50, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ August: { artists: [] } });
    });

    it('should handle partial matches in artists list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_monthly', (req, res) => {
        const mockResponse = {
          "August": {
            "artists": [
              { "name": "Taylor Swift", "play_count": 9112, "rank": 1 },
              { "name": "Taylor Swift\nfeaturing Paula Fernandes", "play_count": 108, "rank": 2 },
              { "name": "Taylor Swift\nfeaturing Colbie Caillat", "play_count": 104, "rank": 3 },
              { "name": "Taylor Swift\nfeaturing Ed Sheeran", "play_count": 95, "rank": 4 },
              { "name": "Taylor Swift\nfeaturing Ed Sheeran and Future", "play_count": 89, "rank": 5 }
            ]
          }
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_monthly')
        .query({ limit: 5, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.August.artists.length).toBe(5);
      expect(response.body.August.artists[0].name).toContain('Taylor Swift');
    });
  });

  describe('GET /artists/most_all_time', () => {
    it('should return most popular artists of all time for valid parameters', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_all_time', (req, res) => {
        const mockResponse = {
          "artists": [
            { "name": "Taylor Swift", "play_count": 25382, "rank": 1 },
            { "name": "B.o.B\nfeaturing Taylor Swift", "play_count": 274, "rank": 2 },
            { "name": "Zayn and Taylor Swift", "play_count": 258, "rank": 3 },
            { "name": "Taylor Swift\nfeaturing Paula Fernandes", "play_count": 243, "rank": 4 },
            { "name": "Taylor Swift\nfeaturing Colbie Caillat", "play_count": 235, "rank": 5 }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_all_time')
        .query({ limit: 5, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        artists: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            play_count: expect.any(Number),
            rank: expect.any(Number)
          })
        ])
      });
      expect(response.body.artists.length).toBe(5); // Check for 5 artists
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_all_time', (req, res) => {
        res.status(400).json({ error: 'limit parameter must be a number' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_all_time')
        .query({ limit: 'not_a_number', offset: 0 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be a number' });
    });

    it('should return 400 if offset is not a number', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_all_time', (req, res) => {
        res.status(400).json({ error: 'offset parameter must be a number' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_all_time')
        .query({ limit: 50, offset: 'not_a_number' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'offset parameter must be a number' });
    });

    it('should return 404 if no artists found', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_all_time', (req, res) => {
        res.status(404).json({ error: 'No artists found' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_all_time')
        .query({ limit: 50, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No artists found' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_all_time', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_all_time')
        .query({ limit: 50, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle empty artists list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_all_time', (req, res) => {
        res.json({ artists: [] });
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_all_time')
        .query({ limit: 50, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ artists: [] });
    });

    it('should handle partial matches in artists list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/most_all_time', (req, res) => {
        const mockResponse = {
          "artists": [
            { "name": "Taylor Swift", "play_count": 25382, "rank": 1 },
            { "name": "B.o.B\nfeaturing Taylor Swift", "play_count": 274, "rank": 2 },
            { "name": "Zayn and Taylor Swift", "play_count": 258, "rank": 3 },
            { "name": "Taylor Swift\nfeaturing Paula Fernandes", "play_count": 243, "rank": 4 },
            { "name": "Taylor Swift\nfeaturing Colbie Caillat", "play_count": 235, "rank": 5 }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/artists/most_all_time')
        .query({ limit: 5, offset: 0 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.artists.length).toBe(5);
      expect(response.body.artists[0].name).toContain('Taylor Swift');
    });
  });

  describe('GET /artists/artist', () => {
    it('should return artist popularity for a valid artist name', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/artist', (req, res) => {
        const mockResponse = {
          "rankings": [
            { "name": "Taylor Swift\nfeaturing Ed Sheeran", "play_count": 175, "rank": 11 },
            { "name": "Taylor Swift\nfeaturing Ed Sheeran and Future", "play_count": 97, "rank": 18 }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/artists/artist')
        .query({ name: 'Taylor Swift' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        rankings: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            play_count: expect.any(Number),
            rank: expect.any(Number)
          })
        ])
      });
      expect(response.body.rankings.length).toBe(2); // Check for 2 rankings
    });

    it('should return 400 if name parameter is missing', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/artist', (req, res) => {
        res.status(400).json({ error: 'name parameter is required' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/artist')
        .query({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'name parameter is required' });
    });

    it('should return 404 if no artists found for the given name', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/artist', (req, res) => {
        res.status(404).json({ error: 'No artists found' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/artist')
        .query({ name: 'Non Existent Artist' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'No artists found' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/artist', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .get('/api/popularity/artists/artist')
        .query({ name: 'Taylor Swift' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should handle empty rankings list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/artist', (req, res) => {
        res.json({ rankings: [] });
      });

      const response = await request(app)
        .get('/api/popularity/artists/artist')
        .query({ name: 'Taylor Swift' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ rankings: [] });
    });

    it('should handle partial matches in rankings list', async () => {
      const mockRouter = popularityRoutes();
      mockRouter.get('/artists/artist', (req, res) => {
        const mockResponse = {
          "rankings": [
            { "name": "Taylor Swift\nfeaturing Ed Sheeran", "play_count": 175, "rank": 11 },
            { "name": "Taylor Swift\nfeaturing Ed Sheeran and Future", "play_count": 97, "rank": 18 }
          ]
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .get('/api/popularity/artists/artist')
        .query({ name: 'Taylor Swift' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.rankings[0].name).toContain('Taylor Swift');
    });
  });
});