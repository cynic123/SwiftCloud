const { Song, Album, Artist } = require('./db');
const moment = require('moment');

const popularityService = {
  GetMostPopularSongs: async (call, callback) => {
    const { period, limit, offset } = call.request;
    try {
      let query = {};
      if (period !== 'all_time') {
        const startDate = moment().subtract(1, period).toDate();
        query = { 'plays.date': { $gte: startDate } };
      }

      const popularSongs = await Song.aggregate([
        { $match: query },
        { $unwind: '$plays' },
        { $group: {
          _id: '$_id',
          title: { $first: '$title' },
          artist: { $first: '$artist' },
          playCount: { $sum: '$plays.count' }
        }},
        { $sort: { playCount: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $project: {
          songId: '$_id',
          title: 1,
          artist: 1,
          playCount: 1,
          popularityScore: { $divide: ['$playCount', { $subtract: [moment().valueOf(), moment().subtract(1, period).valueOf()] }] }
        }}
      ]);

      const totalCount = await Song.countDocuments(query);

      callback(null, { songs: popularSongs, totalCount });
    } catch (error) {
      callback(error);
    }
  },

  GetSongPopularity: async (call, callback) => {
    const { songId } = call.request;
    try {
      const song = await Song.findById(songId);
      if (!song) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: "Song not found"
        });
      }

      const totalPlays = song.plays.reduce((sum, play) => sum + play.count, 0);
      const popularityScore = totalPlays / moment().diff(moment(song.plays[0].date), 'days');

      callback(null, {
        songId: song._id,
        title: song.title,
        artist: song.artist,
        playCount: totalPlays,
        popularityScore
      });
    } catch (error) {
      callback(error);
    }
  },

  GetMostPopularAlbums: async (call, callback) => {
    const { period, limit, offset } = call.request;
    try {
      let query = {};
      if (period !== 'all_time') {
        const startDate = moment().subtract(1, period).toDate();
        query = { 'plays.date': { $gte: startDate } };
      }

      const popularAlbums = await Album.aggregate([
        { $match: query },
        { $unwind: '$plays' },
        { $group: {
          _id: '$_id',
          title: { $first: '$title' },
          artist: { $first: '$artist' },
          playCount: { $sum: '$plays.count' }
        }},
        { $sort: { playCount: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $project: {
          albumId: '$_id',
          title: 1,
          artist: 1,
          playCount: 1,
          popularityScore: { $divide: ['$playCount', { $subtract: [moment().valueOf(), moment().subtract(1, period).valueOf()] }] }
        }}
      ]);

      const totalCount = await Album.countDocuments(query);

      callback(null, { albums: popularAlbums, totalCount });
    } catch (error) {
      callback(error);
    }
  },

  GetAlbumPopularity: async (call, callback) => {
    const { albumId } = call.request;
    try {
      const album = await Album.findById(albumId);
      if (!album) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: "Album not found"
        });
      }

      const totalPlays = album.plays.reduce((sum, play) => sum + play.count, 0);
      const popularityScore = totalPlays / moment().diff(moment(album.plays[0].date), 'days');

      callback(null, {
        albumId: album._id,
        title: album.title,
        artist: album.artist,
        playCount: totalPlays,
        popularityScore
      });
    } catch (error) {
      callback(error);
    }
  },

  GetPopularityByGenre: async (call, callback) => {
    const { genres, period } = call.request;
    try {
      let query = { genre: { $in: genres } };
      if (period !== 'all_time') {
        const startDate = moment().subtract(1, period).toDate();
        query['plays.date'] = { $gte: startDate };
      }

      const genrePopularity = await Song.aggregate([
        { $match: query },
        { $unwind: '$plays' },
        { $group: {
          _id: '$genre',
          playCount: { $sum: '$plays.count' }
        }},
        { $project: {
          genre: '$_id',
          playCount: 1,
          popularityScore: { $divide: ['$playCount', { $subtract: [moment().valueOf(), moment().subtract(1, period).valueOf()] }] }
        }},
        { $sort: { popularityScore: -1 } }
      ]);

      callback(null, { genrePopularity });
    } catch (error) {
      callback(error);
    }
  },

  GetPopularityOverTime: async (call, callback) => {
    const { id, type, startDate, endDate } = call.request;
    try {
      let Model;
      switch(type) {
        case 'song':
          Model = Song;
          break;
        case 'album':
          Model = Album;
          break;
        case 'artist':
          Model = Artist;
          break;
        default:
          throw new Error('Invalid entity type');
      }

      const entity = await Model.findById(id);
      if (!entity) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: `${type} not found`
        });
      }

      const popularityData = entity.plays
        .filter(play => moment(play.date).isBetween(startDate, endDate, null, '[]'))
        .map(play => ({
          date: play.date,
          playCount: play.count,
          popularityScore: play.count / moment(endDate).diff(moment(startDate), 'days')
        }));

      callback(null, {
        id: entity._id,
        type,
        name: entity.title || entity.name,
        popularityData
      });
    } catch (error) {
      callback(error);
    }
  }
};

module.exports = popularityService;