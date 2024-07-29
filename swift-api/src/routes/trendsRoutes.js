const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { Round } = require('../../../utils/commonUtils');

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

// Get overall trends (top 10 artists with their top 10 songs)
router.get('/overall', (req, res) => {
	client.GetOverallTrends({}, (err, response) => {
		if (err) {
			console.error('Error:', err);
			return res.status(500).json({ error: 'Internal Server Error' });
		}

		const roundedResponse = {
			total_plays: response.total_plays,
			average_plays_per_song: Round(response.average_plays_per_song, 3),
			top_artists: response.top_artists.map(artist => ({
				name: artist.name,
				total_plays: artist.total_plays,
				average_plays_per_song: Round(artist.average_plays_per_song, 3),
				growth_rate_per_month: Round(artist.growth_rate_per_month, 3),
				top_songs: artist.top_songs.map(song => ({
					title: song.title,
					plays: song.plays,
					growth_rate_per_month: Round(song.growth_rate_per_month, 3)
				}))
			}))
		};

		res.json(roundedResponse);
	});
});

// Get trends for a specific period of months (top 10 artists with their top top 10 songs)
router.get('/period', (req, res) => {
	const { start_month, end_month } = req.query;
	console.log(`Received request with start_month: ${start_month}, end_month: ${end_month}`);


	// Validation
	if (!start_month || !end_month)
		return res.status(400).json({ error: 'start month and end month must be provided' });

	client.GetTrendsByPeriod({ start_month, end_month }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			return res.status(500).json({ error: 'Internal Server Error' });
		}

		const roundedResponse = {
			total_plays: Round(response.total_plays, 3),
			average_plays_per_song: Round(response.average_plays_per_song, 3),
			top_artists: response.top_artists.map(artist => ({
				name: artist.name,
				total_plays: artist.total_plays,
				average_plays_per_song: Round(artist.average_plays_per_song, 3),
				growth_rate_per_month: Round(artist.growth_rate_per_month, 3),
				top_songs: artist.top_songs.map(song => ({
					title: song.title,
					plays: song.plays,
					growth_rate_per_month: Round(song.growth_rate_per_month, 3)
				}))
			}))
		};

		res.json(roundedResponse);
	});
});

// Get trending songs
router.get('/songs', (req, res) => {
	const { months } = req.query;
	console.log(`Received request with months: "${months}"`);

	// Validation
	if (!months)
		return res.status(400).json({ error: 'months parameter is required' });

	if (months && isNaN(months))
		return res.status(400).json({ error: 'months parameter must be number' });


	client.GetTrendingSongs({ months }, (err, response) => {
		if (err) {
			console.error('Error:', err);
			return res.status(500).json({ error: 'Internal Server Error' });
		}
		res.json(response.songs);
	});
});

module.exports = router;