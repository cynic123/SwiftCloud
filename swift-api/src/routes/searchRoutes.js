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

// Advanced Search (with detailed query, refer API Specification doc for more details
router.post('/advanced', (req, res) => {
	const { query, filters, sort, limit = 10, offset = 0 } = req.body;
	console.log(`Received request with query: ${query}, filters: ${filters}, sort: ${sort}, limit: ${limit}, offset: ${offset}`);

	// Validation
	if (!query) {
		return res.status(400).json({ error: 'query parameter is required' });
	}

	if (limit && isNaN(limit)) {
		return res.status(400).json({ error: 'limit parameter must be a number' });
	}

	if (offset && isNaN(offset)) {
		return res.status(400).json({ error: 'offset parameter must be a number' });
	}

	const validFields = ['title', 'artist', 'album', 'writers', 'year'];
	const validOperators = ['eq', 'gte', 'lte', 'contains'];

	if (filters) {
		if (!Array.isArray(filters)) {
			return res.status(400).json({ error: 'filters must be an array' });
		}
		for (let filter of filters) {
			if (!filter.field || !filter.operator) {
				return res.status(400).json({ error: 'each filter must have a field and an operator' });
			}
			if (!validFields.includes(filter.field)) {
				return res.status(400).json({ error: `invalid field in filter: ${filter.field}` });
			}
			if (!validOperators.includes(filter.operator)) {
				return res.status(400).json({ error: `invalid operator in filter: ${filter.operator}` });
			}

			// Check for required 'value' parameter
			if (['eq', 'gte', 'lte'].includes(filter.operator)) {
				if (filter.value === undefined) {
					return res.status(400).json({ error: `value is required for operator: ${filter.operator}` });
				}
			}

			// Special handling for 'year' field
			if (filter.field === 'year') {
				let currentYear = new Date().getFullYear();
				if (filter.operator !== 'contains') {
					let yearValue = filter.value;
					if (typeof yearValue === 'string') {
						yearValue = parseInt(yearValue, 10);
					}
					if (isNaN(yearValue)) {
						return res.status(400).json({ error: 'year value must be a valid number' });
					}
					// Check if year is within valid range
					if (yearValue <= 1900 || yearValue > currentYear) {
						return res.status(400).json({ error: `year must be between 1900 and ${currentYear}` });
					}
					// Assign the parsed number back to filter.value
					filter.value = yearValue;
				}
			}

			// Ensure 'contains' operator is not used with 'year' field
			if (filter.field === 'year' && filter.operator === 'contains') {
				return res.status(400).json({ error: "'contains' operator cannot be used with 'year' field" });
			}
		}
	}

	if (sort) {
		if (typeof sort !== 'object' || Array.isArray(sort)) {
			return res.status(400).json({ error: 'sort must be an object' });
		}
		if (!sort.field || !sort.order) {
			return res.status(400).json({ error: 'sort must have a field and an order' });
		}
		if (!validFields.includes(sort.field)) {
			return res.status(400).json({ error: `invalid field in sort: ${sort.field}` });
		}
		if (!['asc', 'desc'].includes(sort.order)) {
			return res.status(400).json({ error: `invalid order in sort: ${sort.order}` });
		}
	}

	client.AdvancedSearch({ query, filters, sort, limit, offset }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response);
	});
});

router.post('/autocomplete', (req, res) => {
	const { query, limit = 10 } = req.body;
	console.log(`Received request with query: ${query}, limit: ${limit}`);

	// Validation
	if (!query)
		return res.status(400).json({ error: 'query parameter is required' });

	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	client.Autocomplete({ query, limit: parseInt(limit) }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json({ suggestions: response.suggestions });
	});
});

module.exports = router;