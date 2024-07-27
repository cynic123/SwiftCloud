const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const router = express.Router();

const PROTO_PATH = path.resolve(__dirname, '../../../proto/popularity.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const popularityProto = grpc.loadPackageDefinition(packageDefinition).popularity;

const client = new popularityProto.PopularityService('localhost:3003', grpc.credentials.createInsecure());

// Health Check
router.get('/health', (req, res) => {
    client.HealthCheck({}, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get most popular songs
router.get('/most', (req, res) => {
    const { period = 'monthly', limit = 5, offset = 0 } = req.query;
    console.log(`Received request with period: ${period}, limit: ${limit}, offset: ${offset}`);
  
    client.GetMostPopularSongs({ period, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
      if (err) {
        console.error('gRPC error:', err);
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
      }

      if (!response) {
        console.error('Received null response from gRPC service');
        return res.status(500).json({ error: 'Received null response from service' });
      }
  
      if (period === 'monthly') {
        if (!response.months || Object.keys(response.months).length === 0) {
          console.error('Received empty monthly response from gRPC service');
          return res.status(404).json({ error: 'No data found' });
        }
        res.json(response.months);
      } else {
        if (!response.songs || response.songs.length === 0) {
          console.error('Received empty all-time response from gRPC service');
          return res.status(404).json({ error: 'No data found' });
        }
        res.json(response.songs);
      }
    });
  });

  router.get('/song', (req, res) => {
    const { title } = req.query;

    console.log(`Received request with title: "${title}"`);

    if (!title) {
        console.log('No title provided, returning 400 error');
        return res.status(400).json({ error: 'Title query is required' });
    }

    client.GetSongPopularity({ title_query: title }, (err, response) => {
        if (err) {
            console.error('gRPC error:', err);
            if (err.code === grpc.status.NOT_FOUND) {
                console.log('No songs found, returning 404 error');
                return res.status(404).json({ error: 'No songs found' });
            }
            console.log('Internal server error, returning 500 error');
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        console.log('Received response from gRPC service:', JSON.stringify(response, null, 2));
        res.json(response);
    });
});

// Get most popular albums
router.get('/albums', (req, res) => {
    const { period = 'all_time', limit = 10, offset = 0 } = req.query;
    client.GetMostPopularAlbums({ period, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity of a specific album
router.get('/albums/:id', (req, res) => {
    const { id } = req.params;
    client.GetAlbumPopularity({ album_id: id }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity by genre
router.get('/genres', (req, res) => {
    const { genres, period = 'all_time' } = req.query;
    const genreList = genres ? genres.split(',') : [];
    client.GetPopularityByGenre({ genres: genreList, period }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity over time
router.get('/over-time', (req, res) => {
    const { id, type, startDate, endDate } = req.query;
    client.GetPopularityOverTime({ id, type, start_date: startDate, end_date: endDate }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get artist popularity
router.get('/artists/:id', (req, res) => {
    const { id } = req.params;
    client.GetArtistPopularity({ artist_id: id }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity comparison
router.get('/compare', (req, res) => {
    const { type, ids, period = 'all_time' } = req.query;
    const idList = ids ? ids.split(',') : [];
    client.GetPopularityComparison({ type, ids: idList, period }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

module.exports = router;