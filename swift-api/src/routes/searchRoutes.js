const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const router = express.Router();

const PROTO_PATH = path.resolve(__dirname, '../../../proto/search.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const searchProto = grpc.loadPackageDefinition(packageDefinition).search;

const SEARCH_SERVICE_PORT = process.env.SEARCH_SERVICE_PORT || 3002;
const client = new searchProto.SearchService(`localhost:${SEARCH_SERVICE_PORT}`, grpc.credentials.createInsecure());

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

// Basic Seach (without query)
router.post('/', (req, res) => {
    const { query, limit = 10, offset = 0 } = req.body;
    client.Search({ query, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Advanced Search (with detailed query, refer README.md for query specification details)
router.post('/advanced', (req, res) => {
    client.AdvancedSearch(req.body, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

router.post('/autocomplete', (req, res) => {
    const { query, limit = 5 } = req.body;
    client.Autocomplete({ query, limit: parseInt(limit) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

module.exports = router;