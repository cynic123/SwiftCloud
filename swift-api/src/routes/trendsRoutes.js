const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const router = express.Router();

const PROTO_PATH = path.resolve(__dirname, '../../../proto/trend.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const trendProto = grpc.loadPackageDefinition(packageDefinition).trend;

const client = new trendProto.TrendService('localhost:3004', grpc.credentials.createInsecure());

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

// Get overall trends
router.get('/', (req, res) => {
    client.GetOverallTrends({}, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get trends for a specific time period
router.get('/period', (req, res) => {
    const { startDate, endDate } = req.query;
    client.GetTrendsByPeriod({ startDate, endDate }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get trending songs
router.get('/songs', (req, res) => {
    const { limit = 10 } = req.query;
    client.GetTrendingSongs({ limit: parseInt(limit) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.songs);
    });
});

// Get trend comparison between two artists
router.get('/compare', (req, res) => {
    const { artist1, artist2 } = req.query;
    client.CompareTrends({ artist1, artist2 }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get genre trends
router.get('/genres', (req, res) => {
    client.GetGenreTrends({}, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.genreTrends);
    });
});

// Get seasonal trends
router.get('/seasonal', (req, res) => {
    const { year } = req.query;
    client.GetSeasonalTrends({ year: parseInt(year) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.seasonalTrends);
    });
});

module.exports = router;