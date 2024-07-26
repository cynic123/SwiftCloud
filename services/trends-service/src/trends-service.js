const { Song, Album, Artist } = require('./db');
const moment = require('moment');

const trendService = {
  HealthCheck: async (call, callback) => {
    try {
      callback(null, { status: 'Welcome to Trends Service!' });
    } catch (err) {
      console.error('Health check error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },
  
  GetOverallTrends: async (call, callback) => {
    try {
      const totalPlays = await Song.aggregate([
        { $unwind: '$plays' },
        { $group: { _id: null, total: { $sum: '$plays.count' } } }
      ]);

      const uniqueListeners = await Song.distinct('plays.listeners').length;

      const topGenres = await Song.aggregate([
        { $group: { _id: '$genre', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const topArtists = await Artist.find().sort('-popularity').limit(5);

      callback(null, {
        totalPlays: totalPlays[0].total,
        averagePlayPerSong: totalPlays[0].total / await Song.countDocuments(),
        uniqueListeners,
        topGenres,
        topArtists
      });
    } catch (error) {
      callback(error);
    }
  },

  GetTrendsByPeriod: async (call, callback) => {
    const { startDate, endDate } = call.request;
    try {
      const trendData = await Song.aggregate([
        { $unwind: '$plays' },
        { $match: { 
          'plays.date': { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
          } 
        }},
        { $group: {
          _id: null,
          totalPlays: { $sum: '$plays.count' },
          uniqueListeners: { $addToSet: '$plays.listeners' }
        }}
      ]);

      const topSongs = await Song.find({
        'plays.date': { $gte: new Date(startDate), $lte: new Date(endDate) }
      }).sort('-plays.count').limit(10);

      callback(null, {
        startDate,
        endDate,
        totalPlays: trendData[0].totalPlays,
        averagePlayPerSong: trendData[0].totalPlays / await Song.countDocuments(),
        uniqueListeners: trendData[0].uniqueListeners.length,
        topSongs
      });
    } catch (error) {
      callback(error);
    }
  },

  GetTrendingSongs: async (call, callback) => {
    const { limit } = call.request;
    try {
      const trendingSongs = await Song.aggregate([
        { $unwind: '$plays' },
        { $group: {
          _id: '$_id',
          title: { $first: '$title' },
          artist: { $first: '$artist' },
          totalPlays: { $sum: '$plays.count' },
          recentPlays: { 
            $sum: { 
              $cond: [
                { $gte: ['$plays.date', moment().subtract(7, 'days').toDate()] },
                '$plays.count',
                0
              ]
            }
          }
        }},
        { $project: {
          title: 1,
          artist: 1,
          totalPlays: 1,
          growthRate: { $divide: ['$recentPlays', '$totalPlays'] }
        }},
        { $sort: { growthRate: -1 } },
        { $limit: limit }
      ]);

      callback(null, { songs: trendingSongs });
    } catch (error) {
      callback(error);
    }
  },

  CompareTrends: async (call, callback) => {
    const { entityType, entityId1, entityId2, startDate, endDate } = call.request;
    try {
      let Model;
      switch(entityType) {
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

      const entity1 = await Model.findById(entityId1);
      const entity2 = await Model.findById(entityId2);

      const trend1 = await getTrendData(Model, entityId1, startDate, endDate);
      const trend2 = await getTrendData(Model, entityId2, startDate, endDate);

      callback(null, {
        entityType,
        entity1: { ...entity1.toObject(), trend: trend1 },
        entity2: { ...entity2.toObject(), trend: trend2 }
      });
    } catch (error) {
      callback(error);
    }
  },

  GetGenreTrends: async (call, callback) => {
    const { genres, startDate, endDate } = call.request;
    try {
      const genreTrends = await Song.aggregate([
        { $match: { genre: { $in: genres } } },
        { $unwind: '$plays' },
        { $match: { 
          'plays.date': { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
          } 
        }},
        { $group: {
          _id: '$genre',
          totalPlays: { $sum: '$plays.count' },
          uniqueListeners: { $addToSet: '$plays.listeners' }
        }},
        { $project: {
          genre: '$_id',
          totalPlays: 1,
          uniqueListeners: { $size: '$uniqueListeners' },
          popularity: { $divide: ['$totalPlays', { $size: '$uniqueListeners' }] }
        }},
        { $sort: { popularity: -1 } }
      ]);

      callback(null, { genres: genreTrends });
    } catch (error) {
      callback(error);
    }
  },

  GetSeasonalTrends: async (call, callback) => {
    const { year } = call.request;
    try {
      const seasonalTrends = await Song.aggregate([
        { $unwind: '$plays' },
        { $match: { 
          'plays.date': { 
            $gte: new Date(`${year}-01-01`), 
            $lte: new Date(`${year}-12-31`) 
          } 
        }},
        { $project: {
          title: 1,
          artist: 1,
          plays: 1,
          season: {
            $switch: {
              branches: [
                { case: { $lte: [{ $month: '$plays.date' }, 2] }, then: 'Winter' },
                { case: { $lte: [{ $month: '$plays.date' }, 5] }, then: 'Spring' },
                { case: { $lte: [{ $month: '$plays.date' }, 8] }, then: 'Summer' },
                { case: { $lte: [{ $month: '$plays.date' }, 11] }, then: 'Fall' }
              ],
              default: 'Winter'
            }
          }
        }},
        { $group: {
          _id: '$season',
          totalPlays: { $sum: '$plays.count' },
          topSongs: { $push: { title: '$title', artist: '$artist', plays: '$plays.count' } }
        }},
        { $project: {
          season: '$_id',
          totalPlays: 1,
          topSongs: { $slice: ['$topSongs', 5] }
        }},
        { $sort: { season: 1 } }
      ]);

      callback(null, { year, seasons: seasonalTrends });
    } catch (error) {
      callback(error);
    }
  }
};

async function getTrendData(Model, id, startDate, endDate) {
  return Model.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(id) } },
    { $unwind: '$plays' },
    { $match: { 
      'plays.date': { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      } 
    }},
    { $group: {
      _id: null,
      totalPlays: { $sum: '$plays.count' },
      uniqueListeners: { $addToSet: '$plays.listeners' }
    }},
    { $project: {
      _id: 0,
      totalPlays: 1,
      uniqueListeners: { $size: '$uniqueListeners' },
      popularity: { $divide: ['$totalPlays', { $size: '$uniqueListeners' }] }
    }}
  ]);
}

module.exports = trendService;