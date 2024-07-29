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
    console.log(`Received request with period: ${period}, limit: ${limit}, offset: ${offset}`);

	// Validation
	if (!period) {
		return res.status(400).json({ error: 'Period parameter is required' });
	}

	if (limit && isNaN(limit)) {
		return res.status(400).json({ error: 'Limit parameter must be a number' });
	}

	if (offset && isNaN(offset)) {
		return res.status(400).json({ error: 'Offset parameter must be a number' });
	}

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
    const { query, filters, sort, limit = 10, offset = 0 } = call.request;
    console.log(`Received request with period: ${period}, filters: ${filters}, limit: ${limit}, offset: ${offset}`);

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
    console.log(`Received request with query: ${query}, limit: ${limit}`);

    // Validation
    if (!query) {
		return res.status(400).json({ error: 'query parameter is required' });
	}

	if (limit && isNaN(limit)) {
		return res.status(400).json({ error: 'limit parameter must be a number' });
	}

    client.Autocomplete({ query, limit: parseInt(limit) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ suggestions: response.suggestions });
    });
});

module.exports = router;