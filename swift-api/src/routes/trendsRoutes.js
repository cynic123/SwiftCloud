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

const roundToThree = (num) => {
  return Number(Math.round(num + 'e3') + 'e-3');
};

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
router.get('/overall', (req, res) => {
	client.GetOverallTrends({}, (err, response) => {
		if (err) {
			console.error('Error:', err);
			return res.status(500).json({ error: 'Internal Server Error' });
		}

		const roundedResponse = {
			total_plays: response.total_plays,
			average_plays_per_song: roundToThree(response.average_plays_per_song),
			top_artists: response.top_artists.map(artist => ({
				name: artist.name,
				total_plays: artist.total_plays,
				average_plays_per_song: roundToThree(artist.average_plays_per_song),
				growth_rate_per_month: roundToThree(artist.growth_rate_per_month),
				top_songs: artist.top_songs.map(song => ({
					title: song.title,
					plays: song.plays,
					growth_rate_per_month: roundToThree(song.growth_rate_per_month)
				}))
			}))
		};

		res.json(roundedResponse);
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