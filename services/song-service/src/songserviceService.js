const { Song } = require('./db');

const songService = {
  GetAllSongs: async (call, callback) => {
    const { limit, offset } = call.request;
    try {
      const songs = await Song.find().skip(offset).limit(limit);
      const total = await Song.countDocuments();
      callback(null, { songs, total });
    } catch (error) {
      callback(error);
    }
  },

  GetSongById: async (call, callback) => {
    const { id } = call.request;
    try {
      const song = await Song.findById(id);
      if (!song) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: "Song not found"
        });
      }
      callback(null, song);
    } catch (error) {
      callback(error);
    }
  },

  GetSongsByYear: async (call, callback) => {
    const { year } = call.request;
    try {
      const songs = await Song.find({ year });
      callback(null, { songs });
    } catch (error) {
      callback(error);
    }
  },

  CreateSong: async (call, callback) => {
    const songData = call.request;
    try {
      const newSong = new Song(songData);
      const savedSong = await newSong.save();
      callback(null, savedSong);
    } catch (error) {
      callback(error);
    }
  },

  UpdateSong: async (call, callback) => {
    const { id, ...updateData } = call.request;
    try {
      const updatedSong = await Song.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedSong) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: "Song not found"
        });
      }
      callback(null, updatedSong);
    } catch (error) {
      callback(error);
    }
  },

  DeleteSong: async (call, callback) => {
    const { id } = call.request;
    try {
      const deletedSong = await Song.findByIdAndDelete(id);
      if (!deletedSong) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: "Song not found"
        });
      }
      callback(null, { success: true, message: "Song deleted successfully" });
    } catch (error) {
      callback(error);
    }
  },

  GetSongsByAlbum: async (call, callback) => {
    const { album } = call.request;
    try {
      const songs = await Song.find({ album });
      callback(null, { songs });
    } catch (error) {
      callback(error);
    }
  },

  GetSongsByArtist: async (call, callback) => {
    const { artist } = call.request;
    try {
      const songs = await Song.find({ artist });
      callback(null, { songs });
    } catch (error) {
      callback(error);
    }
  }
};

module.exports = songService;