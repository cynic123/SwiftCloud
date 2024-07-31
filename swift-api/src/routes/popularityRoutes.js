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

// Get most popular songs
router.get('/songs/most', (req, res) => {
	const { period, limit = 50, offset = 0 } = req.query;
	console.log(`Received request with period: ${period}, limit: ${limit}, offset: ${offset}`);

	// Validation
	if (!period)
		return res.status(400).json({ error: 'period parameter is required' });

	if(!(period === 'monthly' || period === 'all_time'))
		return res.status(400).json({ error: 'period should be either monthly or all_time' });

	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'offset parameter must be a number' });

	client.GetMostPopularSongs({ period, limit, offset }, (err, response) => {
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
				console.error('Received empty response from gRPC service');
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

	// Validation
	if (!title)
		return res.status(400).json({ error: 'Title query is required' });

	client.GetSongPopularity({ title }, (err, response) => {
		if (err) {
			console.error('gRPC error:', err);
			if (err.code === StatusCodes.NOT_FOUND) {
				console.error('No songs found, returning 404 error');
				return res.status(404).json({ error: 'No songs found' });
			}
			console.error('Internal server error, returning 500 error');
			return res.status(500).json({ error: 'Internal Server Error' });
		}

		res.json(response);
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

// Get most popular artists
router.get('/artists/most', (req, res) => {
	const { period, limit = 10, offset = 0 } = req.query;
	console.log(`Received request with period: ${period}, limit: ${limit}, offset: ${offset}`);

	// Validation
	if (!period)
		return res.status(400).json({ error: 'Period parameter is required' });

	if (limit && isNaN(limit))
		return res.status(400).json({ error: 'Limit parameter must be a number' });

	if (offset && isNaN(offset))
		return res.status(400).json({ error: 'Offset parameter must be a number' });

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