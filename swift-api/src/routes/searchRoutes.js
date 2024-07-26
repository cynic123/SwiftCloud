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

const client = new searchProto.SearchService('localhost:3002', grpc.credentials.createInsecure());

// General search
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

// Search songs
router.get('/songs', (req, res) => {
    const { query, limit = 10, offset = 0 } = req.query;
    client.SearchSongs({ query, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Search albums
router.get('/albums', (req, res) => {
    const { query, limit = 10, offset = 0 } = req.query;
    client.SearchAlbums({ query, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Search artists
router.get('/artists', (req, res) => {
    const { query, limit = 10, offset = 0 } = req.query;
    client.SearchArtists({ query, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Advanced search
router.post('/advanced', (req, res) => {
    const { query, filters, sort, limit = 10, offset = 0 } = req.body;
    client.AdvancedSearch({ query, filters, sort, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Autocomplete
router.get('/autocomplete', (req, res) => {
    const { query, limit = 5 } = req.query;
    client.Autocomplete({ query, limit: parseInt(limit) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

module.exports = router;