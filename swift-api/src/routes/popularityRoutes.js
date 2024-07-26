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

const client = new popularityProto.PopularityService('localhost:50052', grpc.credentials.createInsecure());

// Get most popular songs
router.get('/songs', (req, res) => {
    const { period = 'all_time', limit = 10, offset = 0 } = req.query;
    client.GetMostPopularSongs({ period, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity of a specific song
router.get('/songs/:id', (req, res) => {
    const { id } = req.params;
    client.GetSongPopularity({ song_id: id }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get most popular albums
router.get('/albums', (req, res) => {
    const { period = 'all_time', limit = 10, offset = 0 } = req.query;
    client.GetMostPopularAlbums({ period, limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity of a specific album
router.get('/albums/:id', (req, res) => {
    const { id } = req.params;
    client.GetAlbumPopularity({ album_id: id }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity by genre
router.get('/genres', (req, res) => {
    const { genres, period = 'all_time' } = req.query;
    const genreList = genres ? genres.split(',') : [];
    client.GetPopularityByGenre({ genres: genreList, period }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity over time
router.get('/over-time', (req, res) => {
    const { id, type, startDate, endDate } = req.query;
    client.GetPopularityOverTime({ id, type, start_date: startDate, end_date: endDate }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get artist popularity
router.get('/artists/:id', (req, res) => {
    const { id } = req.params;
    client.GetArtistPopularity({ artist_id: id }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get popularity comparison
router.get('/compare', (req, res) => {
    const { type, ids, period = 'all_time' } = req.query;
    const idList = ids ? ids.split(',') : [];
    client.GetPopularityComparison({ type, ids: idList, period }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

module.exports = router;