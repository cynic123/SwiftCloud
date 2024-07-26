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

const client = new songProto.SongService('localhost:50051', grpc.credentials.createInsecure());

// Get all songs
router.get('/', (req, res) => {
    const { limit = 10, offset = 0 } = req.query;
    client.GetAllSongs({ limit: parseInt(limit), offset: parseInt(offset) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get a song by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    client.GetSongById({ id }, (err, response) => {
        if (err) {
            if (err.code === grpc.status.NOT_FOUND) {
                return res.status(404).json({ error: 'Song not found' });
            }
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get songs by year
router.get('/year/:year', (req, res) => {
    const { year } = req.params;
    client.GetSongsByYear({ year: parseInt(year) }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Create a new song
router.post('/', (req, res) => {
    const songData = req.body;
    client.CreateSong(songData, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(201).json(response);
    });
});

// Update a song
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const songData = { id, ...req.body };
    client.UpdateSong(songData, (err, response) => {
        if (err) {
            if (err.code === grpc.status.NOT_FOUND) {
                return res.status(404).json({ error: 'Song not found' });
            }
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Delete a song
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    client.DeleteSong({ id }, (err, response) => {
        if (err) {
            if (err.code === grpc.status.NOT_FOUND) {
                return res.status(404).json({ error: 'Song not found' });
            }
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get songs by album
router.get('/album/:album', (req, res) => {
    const { album } = req.params;
    client.GetSongsByAlbum({ album }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

// Get songs by artist
router.get('/artist/:artist', (req, res) => {
    const { artist } = req.params;
    client.GetSongsByArtist({ artist }, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(response);
    });
});

module.exports = router;