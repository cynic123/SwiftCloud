const { Song, Album, Artist } = require('./db');
const moment = require('moment');

const popularityService = {
  HealthCheck: async (call, callback) => {
    try {
      callback(null, { status: 'Welcome to Popularity Service!' });
    } catch (err) {
      console.error('Health check error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetMostPopularSongs: async (call, callback) => {
    const { period, limit, offset } = call.request;
    console.log(`Received request with period: ${period}, limit: ${limit}, offset: ${offset}`);
    try {
      let aggregationPipeline;

      if (period === 'monthly') {
        aggregationPipeline = [
          { $unwind: '$plays' },
          {
            $group: {
              _id: { songId: '$_id', month: '$plays.month' },
              title: { $first: '$title' },
              artist: { $first: '$artist' },
              playCount: { $first: '$plays.count' }
            }
          },
          { $sort: { playCount: -1, title: 1 } },
          {
            $group: {
              _id: '$_id.month',
              songs: {
                $push: {
                  title: '$title',
                  artist: '$artist',
                  play_count: '$playCount'
                }
              },
              maxPlayCount: { $max: '$playCount' }
            }
          },
          {
            $project: {
              _id: 0,
              month: '$_id',
              songs: {
                $map: {
                  input: { $slice: ['$songs', offset, limit] },
                  in: {
                    $mergeObjects: [
                      '$$this',
                      {
                        popularity_score: { $divide: ['$$this.play_count', '$maxPlayCount'] },
                        rank: { $add: [{ $indexOfArray: ['$songs', '$$this'] }, 1] }
                      }
                    ]
                  }
                }
              }
            }
          }
        ];
      } else { // all_time
        aggregationPipeline = [
          { $unwind: '$plays' },
          {
            $group: {
              _id: '$_id',
              title: { $first: '$title' },
              artist: { $first: '$artist' },
              totalPlays: { $sum: '$plays.count' }
            }
          },
          { $sort: { totalPlays: -1, title: 1 } },
          { $skip: offset },
          { $limit: limit },
          {
            $group: {
              _id: null,
              songs: { $push: '$$ROOT' },
              maxPlayCount: { $max: '$totalPlays' }
            }
          },
          { $unwind: { path: '$songs', includeArrayIndex: 'index' } },
          {
            $project: {
              _id: 0,
              title: '$songs.title',
              artist: '$songs.artist',
              play_count: '$songs.totalPlays',
              popularity_score: { $divide: ['$songs.totalPlays', '$maxPlayCount'] },
              rank: { $add: ['$index', 1] }
            }
          }
        ];
      }

      console.log('Aggregation Pipeline:', JSON.stringify(aggregationPipeline, null, 2));

      const result = await Song.aggregate(aggregationPipeline);

      console.log(`Found ${result.length} ${period === 'monthly' ? 'months' : 'songs'}`);
      console.log('Raw MongoDB result:', JSON.stringify(result, null, 2));

      let response;
      if (period === 'monthly') {
        response = {
          months: result.reduce((acc, { month, songs }) => {
            acc[month] = { songs };
            return acc;
          }, {})
        };
      } else {
        response = { songs: result };
      }

      console.log('Formatted response:', JSON.stringify(response, null, 2));
      console.log('Response keys:', Object.keys(response));
      console.log('Is response empty?', Object.keys(response.months || {}).length === 0);

      if (Object.keys(response.months || {}).length === 0 && (!response.songs || response.songs.length === 0)) {
        console.error('Empty response generated. Check MongoDB query and data.');
        callback(new Error('No data found'), null);
      } else {
        console.log('Sending response to client');
        callback(null, response);
      }
    } catch (error) {
      console.error('Error in GetMostPopularSongs:', error);
      callback(error, null);
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
        {
          $group: {
            _id: '$_id',
            title: { $first: '$title' },
            artist: { $first: '$artist' },
            playCount: { $sum: '$plays.count' }
          }
        },
        { $sort: { playCount: -1 } },
        { $skip: offset },
        { $limit: limit },
        {
          $project: {
            albumId: '$_id',
            title: 1,
            artist: 1,
            playCount: 1,
            popularityScore: { $divide: ['$playCount', { $subtract: [moment().valueOf(), moment().subtract(1, period).valueOf()] }] }
          }
        }
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
        {
          $group: {
            _id: '$genre',
            playCount: { $sum: '$plays.count' }
          }
        },
        {
          $project: {
            genre: '$_id',
            playCount: 1,
            popularityScore: { $divide: ['$playCount', { $subtract: [moment().valueOf(), moment().subtract(1, period).valueOf()] }] }
          }
        },
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
      switch (type) {
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