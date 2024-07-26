const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const router = express.Router();

const PROTO_PATH = path.resolve(__dirname, '../../../proto/song.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const songProto = grpc.loadPackageDefinition(packageDefinition).song;

const SONG_SERVICE_PORT = process.env.SONG_SERVICE_PORT || 3001;
const client = new songProto.SongService(`localhost:${SONG_SERVICE_PORT}`, grpc.credentials.createInsecure());

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

router.get('/', (req, res) => {
    client.GetAllSongs({}, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.songs);
    });
});

router.get('/year/:year', (req, res) => {
    const year = parseInt(req.params.year);
    client.GetSongsByYear({ year }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.songs);
    });
});

router.get('/artist/:artist', (req, res) => {
    const artist = req.params.artist;
    client.GetSongsByArtist({ artist }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.songs);
    });
});

router.get('/writer/:writer', (req, res) => {
    const writer = req.params.writer;
    client.GetSongsByWriter({ writer }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.songs);
    });
});

router.get('/album/:album', (req, res) => {
    const album = req.params.album;
    client.GetSongsByAlbum({ album }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.songs);
    });
});

router.get('/month/:month', (req, res) => {
    const month = req.params.month;
    client.GetSongsByMonth({ month }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response.songs);
    });
});

module.exports = router;