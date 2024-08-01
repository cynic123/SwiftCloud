const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { StatusCodes } = require('http-status-codes');

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

// Get most popular songs monthly wise
router.get('/songs/most_monthly', (req, res) => {
	const { limit = 50, offset = 0 } = req.query;
	console.log(`Received request with limit: ${limit}, offset: ${offset}`);

	// Validation
	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'offset parameter must be a number' });

	client.GetMostPopularSongsMonthly({ limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No songs found, returning 404 error');
				return res.status(404).json({ error: 'No songs found' });
			}
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response.months);
	});
});

// Get most popular songs all time
router.get('/songs/most_all_time', (req, res) => {
	const { limit = 50, offset = 0 } = req.query;
	console.log(`Received request with limit: ${limit}, offset: ${offset}`);

	// Validation
	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'offset parameter must be a number' });

	client.GetMostPopularSongsAllTime({ limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No songs found, returning 404 error');
				return res.status(404).json({ error: 'No songs found' });
			}
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response.songs);
	});
});

// Get most popular albums monthly wise
router.get('/albums/most_monthly', (req, res) => {
	const { limit = 50, offset = 0 } = req.query;
	console.log(`Received request with limit: ${limit}, offset: ${offset}`);

	// Validation
	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'offset parameter must be a number' });

	client.GetMostPopularAlbumsMonthly({ limit: limit, offset: offset }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No albums found, returning 404 error');
				return res.status(404).json({ error: 'No albums found' });
			}
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response.months);
	});
});

// Get most popular albums all time
router.get('/albums/most_all_time', (req, res) => {
	const { limit = 50, offset = 0 } = req.query;
	console.log(`Received request with limit: ${limit}, offset: ${offset}`);

	// Validation
	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'offset parameter must be a number' });

	client.GetMostPopularAlbumsAllTime({ limit: limit, offset: offset }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No albums found, returning 404 error');
				return res.status(404).json({ error: 'No albums found' });
			}
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response);
	});
});

/* Get overall rankings of albums that match or start with the user's searched name, aggregated across all 
 * available months in the input dataset.
 */
router.get('/albums/album', (req, res) => {
	const { name } = req.query;
	console.log(`Received request with name: "${name}"`);

	// Validation
	if (!name)
		return res.status(400).json({ error: 'name parameter is required' });

	client.GetAlbumPopularity({ name }, (err, response) => {
		if (err) {
			console.error('gRPC error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No albums found, returning 404 error');
				return res.status(404).json({ error: 'No albums found' });
			}
			console.error('Internal server error, returning 500 error');
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response);
	});
});

// Get most popular artists monthly wise
router.get('/artists/most_monthly', (req, res) => {
	const { limit = 50, offset = 0 } = req.query;
	console.log(`Received request with limit: ${limit}, offset: ${offset}`);

	// Validation
	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'offset parameter must be a number' });

	client.GetMostPopularArtistsMonthly({ limit: limit, offset: offset }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No artists found, returning 404 error');
				return res.status(404).json({ error: 'No artists found' });
			}
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response.months);
	});
});

// Get most popular artists all time
router.get('/artists/most_all_time', (req, res) => {
	const { limit = 50, offset = 0 } = req.query;
	console.log(`Received request with limit: ${limit}, offset: ${offset}`);

	// Validation
	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'offset parameter must be a number' });

	client.GetMostPopularArtistsAllTime({ limit: limit, offset: offset }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No albums found, returning 404 error');
				return res.status(404).json({ error: 'No albums found' });
			}
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response);
	});
});

/* Get overall rankings of artists that match or start with the user's searched name, aggregated across all 
 * available months in the input dataset.
 */
router.get('/artists/artist', (req, res) => {
	const { name } = req.query;
	console.log(`Received request with name: "${name}"`);

	// Validation
	if (!name)
		return res.status(400).json({ error: 'name parameter is required' });

	client.GetArtistPopularity({ name }, (err, response) => {
		if (err) {
			console.error('gRPC error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No artists found, returning 404 error');
				return res.status(404).json({ error: 'No artists found' });
			}
			console.error('Internal server error, returning 500 error');
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response);
	});
});

module.exports = router;