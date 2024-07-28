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
router.get('/songs/most', (req, res) => {
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

/* Get overall rankings of songs that match or start with the user's searched title, aggregated across all 
 * available months in the input dataset.
 */
router.get('/songs/song', (req, res) => {
    const { title } = req.query;

    console.log(`Received request with title: "${title}"`);

    if (!title) {
        console.log('No title provided, returning 400 error');
        return res.status(400).json({ error: 'Title query is required' });
    }

    client.GetSongPopularity({ title }, (err, response) => {
        if (err) {
            console.error('gRPC error:', err);
            if (err.code === grpc.status.NOT_FOUND) {
                console.error('No songs found, returning 404 error');
                return res.status(404).json({ error: 'No songs found' });
            }
            console.error('Internal server error, returning 500 error');
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        res.json(response);
    });
});

// Get most popular albums
router.get('/albums/most', (req, res) => {
    const { period = 'all_time', limit = 10, offset = 0 } = req.query;
    client.GetMostPopularAlbums({ period, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

/* Get overall rankings of albums that match or start with the user's searched name, aggregated across all 
 * available months in the input dataset.
 */
router.get('/albums/album', (req, res) => {
  const { name } = req.query;  // Use req.query to get the name parameter
  client.GetAlbumPopularity({ name }, (err, response) => {
      if (err) {
          console.error('Error:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json(response);
  });
});

// Get most popular artists
router.get('/artists/most', (req, res) => {
  const { period = 'all_time', limit = 10, offset = 0 } = req.query;
  client.GetMostPopularArtists({ period, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
      if (err) {
          console.error('Error:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json(response);
  });
});

/* Get overall rankings of artists that match or start with the user's searched name, aggregated across all 
 * available months in the input dataset.
 */
router.get('/artists/artist', (req, res) => {
  const { name } = req.query;  // Use req.query to get the name parameter
  client.GetArtistPopularity({ name }, (err, response) => {
      if (err) {
          console.error('Error:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json(response);
  });
});

module.exports = router;