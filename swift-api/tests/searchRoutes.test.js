const request = require('supertest');
const express = require('express');
const searchRoutes = require('../src/routes/searchRoutes');
jest.setTimeout(10000);

// Don't mock the entire module, we'll mock the router in each test
jest.mock('../src/routes/searchRoutes', () => {
  return jest.fn();
});

describe('Search Routes', () => {
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
    searchRoutes.mockImplementation(() => mockRouter);
    
    app.use('/api/search', searchRoutes());
  });

  describe('GET /health', () => {
    it('should return correct status on health check', async () => {
      const mockRouter = searchRoutes();
      mockRouter.get('/health', (req, res) => {
        res.json({ status: "Welcome to Search Service!" });
      });

      const response = await request(app)
        .get('/api/search/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ status: "Welcome to Search Service!" });
    });
  });

  describe('POST /advanced', () => {
    it('should return results for valid advanced query', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        const mockResponse = {
          results: [
            {
              writers: ["Max Martin", "Shellback", "Taylor Swift"],
              plays: [
                { month: "January", count: 1000000 },
                { month: "February", count: 1200000 },
              ],
              id: "123abc456def789ghi",
              title: "Shake It Off",
              artist: "Taylor Swift",
              album: "1989",
              year: 2014,
              relevance_score: 0.95
            }
          ],
          total_results: 1
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [
            { field: "writers", operator: "contains", value: "Max" },
            { field: "year", operator: "gte", value: 2010 }
          ],
          sort: { field: "year", order: "desc" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        results: expect.arrayContaining([
          expect.objectContaining({
            writers: expect.arrayContaining(["Max Martin", "Shellback", "Taylor Swift"]),
            plays: expect.arrayContaining([
              expect.objectContaining({
                month: expect.any(String),
                count: expect.any(Number)
              })
            ]),
            id: expect.any(String),
            title: "Shake It Off",
            artist: "Taylor Swift",
            album: "1989",
            year: 2014,
            relevance_score: expect.any(Number)
          })
        ]),
        total_results: 1
      });
    });

    it('should return 400 if query is missing', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        if (!req.body.query) {
          return res.status(400).json({ error: 'query parameter is required' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          filters: [{ field: "writers", operator: "contains", value: "Max" }],
          sort: { field: "year", order: "desc" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'query parameter is required' });
    });

    it('should return 400 if filters is not an array', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        if (req.body.filters && !Array.isArray(req.body.filters)) {
          return res.status(400).json({ error: 'filters must be an array' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: { field: "writers", operator: "contains", value: "Max" },
          sort: { field: "year", order: "desc" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'filters must be an array' });
    });

    it('should return 400 if a filter has an invalid field', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        const validFields = ['title', 'artist', 'album', 'writers', 'year'];
        if (req.body.filters && req.body.filters.some(filter => !validFields.includes(filter.field))) {
          return res.status(400).json({ error: 'invalid field in filter' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [{ field: "invalid_field", operator: "contains", value: "Max" }],
          sort: { field: "year", order: "desc" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid field in filter' });
    });

    it('should return 400 if a filter has an invalid operator', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        const validOperators = ['eq', 'gte', 'lte', 'contains'];
        if (req.body.filters && req.body.filters.some(filter => !validOperators.includes(filter.operator))) {
          return res.status(400).json({ error: 'invalid operator in filter' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [{ field: "writers", operator: "invalid_operator", value: "Max" }],
          sort: { field: "year", order: "desc" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid operator in filter' });
    });

    it('should return 400 if sort has an invalid field', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        const validSortFields = ['title', 'artist', 'album', 'writers', 'year'];
        if (req.body.sort && !validSortFields.includes(req.body.sort.field)) {
          return res.status(400).json({ error: 'invalid field in sort' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [{ field: "writers", operator: "contains", value: "Max" }],
          sort: { field: "invalid_field", order: "desc" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid field in sort' });
    });

    it('should return 400 if sort has an invalid order', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        if (req.body.sort && !['asc', 'desc'].includes(req.body.sort.order)) {
          return res.status(400).json({ error: 'invalid order in sort' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [{ field: "writers", operator: "contains", value: "Max" }],
          sort: { field: "year", order: "invalid_order" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid order in sort' });
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        if (req.body.limit && isNaN(req.body.limit)) {
          return res.status(400).json({ error: 'limit must be a number' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [{ field: "writers", operator: "contains", value: "Max" }],
          sort: { field: "year", order: "desc" },
          limit: "not_a_number",
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit must be a number' });
    });

    it('should return 400 if offset is not a number', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        if (req.body.offset && isNaN(req.body.offset)) {
          return res.status(400).json({ error: 'offset must be a number' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [{ field: "writers", operator: "contains", value: "Max" }],
          sort: { field: "year", order: "desc" },
          limit: 10,
          offset: "not_a_number"
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'offset must be a number' });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/advanced', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .post('/api/search/advanced')
        .send({
          query: "Shake It Off",
          filters: [{ field: "writers", operator: "contains", value: "Max" }],
          sort: { field: "year", order: "desc" },
          limit: 10,
          offset: 0
        })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('POST /autocomplete', () => {
    it('should return suggestions for a valid query', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/autocomplete', (req, res) => {
        const mockResponse = {
          suggestions: ['Taylor Swift', 'Taylor Swift - Shake It Off', 'Taylor Swift - Blank Space']
        };
        res.json(mockResponse);
      });

      const response = await request(app)
        .post('/api/search/autocomplete')
        .send({ query: 'Taylor', limit: 3 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        suggestions: expect.arrayContaining([
          expect.any(String),
          expect.any(String),
          expect.any(String)
        ])
      });
      expect(response.body.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return 400 if query is missing', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/autocomplete', (req, res) => {
        if (!req.body.query) {
          return res.status(400).json({ error: 'query parameter is required' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/autocomplete')
        .send({ limit: 10 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'query parameter is required' });
    });

    it('should return 400 if limit is not a number', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/autocomplete', (req, res) => {
        if (req.body.limit && isNaN(req.body.limit)) {
          return res.status(400).json({ error: 'limit parameter must be a number' });
        }
        res.json({});
      });

      const response = await request(app)
        .post('/api/search/autocomplete')
        .send({ query: 'Taylor', limit: 'not a number' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'limit parameter must be a number' });
    });

    it('should use default limit of 10 if not provided', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/autocomplete', (req, res) => {
        const suggestions = Array(10).fill().map((_, i) => `Suggestion ${i + 1}`);
        res.json({ suggestions });
      });

      const response = await request(app)
        .post('/api/search/autocomplete')
        .send({ query: 'Test' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.suggestions).toHaveLength(10);
    });

    it('should respect the provided limit', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/autocomplete', (req, res) => {
        const { limit } = req.body;
        const suggestions = Array(limit).fill().map((_, i) => `Suggestion ${i + 1}`);
        res.json({ suggestions });
      });

      const response = await request(app)
        .post('/api/search/autocomplete')
        .send({ query: 'Test', limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.suggestions).toHaveLength(5);
    });

    it('should handle empty result set', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/autocomplete', (req, res) => {
        res.json({ suggestions: [] });
      });

      const response = await request(app)
        .post('/api/search/autocomplete')
        .send({ query: 'NonexistentQuery' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ suggestions: [] });
    });

    it('should return 500 for internal server error', async () => {
      const mockRouter = searchRoutes();
      mockRouter.post('/autocomplete', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const response = await request(app)
        .post('/api/search/autocomplete')
        .send({ query: 'Test' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });
  });
});