const { Song } = require('./db');

const songService = {
  HealthCheck: async (call, callback) => {
    try {
      callback(null, { status: 'Welcome to Songs Service!' });
    } catch (err) {
      console.error('Health check error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },
  
  GetAllSongs: async (call, callback) => {
    try {
      const songs = await Song.find();
      callback(null, { songs });
    } catch (err) {
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetSongsByYear: async (call, callback) => {
    const { year } = call.request;
    try {
      const songs = await Song.find({ year: parseInt(year) });
      callback(null, { songs });
    } catch (err) {
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetSongsByArtist: async (call, callback) => {
    const { artist } = call.request;
    try {
      const songs = await Song.find({ artist: new RegExp(artist, 'i') });
      callback(null, { songs });
    } catch (err) {
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetSongsByWriter: async (call, callback) => {
    const { writer } = call.request;
    try {
      const songs = await Song.find({ writers: { $regex: new RegExp(writer, 'i') } });
      callback(null, { songs: songs.map(song => ({
        id: song._id.toString(),
        title: song.title,
        artist: song.artist,
        writers: song.writers,
        album: song.album,
        year: song.year,
        plays: song.plays
      }))});
    } catch (err) {
      callback({
        code: grpc.status.INTERNAL,
        details: "Error retrieving songs"
      });
    }
  },

  GetSongsByAlbum: async (call, callback) => {
    const { album } = call.request;
    try {
      const songs = await Song.find({ album: new RegExp(album, 'i') });
      callback(null, { songs });
    } catch (err) {
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetSongsByMonth: async (call, callback) => {
    const { month } = call.request;
    try {
      const songs = await Song.find({ 'plays.month': new RegExp(month, 'i') });
      callback(null, { songs });
    } catch (err) {
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  }
};

module.exports = songService;