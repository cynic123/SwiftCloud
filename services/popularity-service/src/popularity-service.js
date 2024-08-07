const { Song, Album, Artist } = require('./db');

const popularityService = {
  HealthCheck: async (call, callback) => {
    try {
      callback(null, { status: 'Welcome to Popularity Service!' });
    } catch (err) {
      console.error('Health check error:', err);
      return callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetMostPopularSongsMonthly: async (call, callback) => {
    const { limit, offset } = call.request;
    console.log(`Received request with limit: ${limit}, offset: ${offset}`);

    try {
      let aggregationPipeline = [
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
        { $sort: { "_id": -1 } },
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
                      rank: { $add: [{ $indexOfArray: ['$songs', '$$this'] }, 1] }
                    }
                  ]
                }
              }
            }
          }
        }
      ];

      const result = await Song.aggregate(aggregationPipeline);

      let response = {
        months: result.reduce((acc, { month, songs }) => {
          acc[month] = { songs };
          return acc;
        }, {})
      };

      if (Object.keys(response.months || {}).length === 0) {
        console.error('Empty response generated. Check MongoDB query and data.');
        return callback({
          code: 404,
          message: 'No songs found',
          status: 'NOT_FOUND'
        });
      } else {
        callback(null, response);
      }
    } catch (error) {
      console.error('Error in GetMostPopularSongsMonthly:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetMostPopularSongsAllTime: async (call, callback) => {
    const { limit, offset } = call.request;
    console.log(`Received request with limit: ${limit}, offset: ${offset}`);

    try {
      let aggregationPipeline = [
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
        {
          $group: {
            _id: null,
            songs: { $push: '$$ROOT' },
          }
        },
        { $unwind: { path: '$songs', includeArrayIndex: 'index' } },
        {
          $project: {
            _id: 0,
            title: '$songs.title',
            artist: '$songs.artist',
            play_count: '$songs.totalPlays',
            rank: { $add: ['$index', 1] }
          }
        }
      ];

      const result = await Song.aggregate(aggregationPipeline);
      let response = { songs: result };

      if (!response.songs || response.songs.length === 0) {
        return callback({
          code: 404,
          message: 'No songs found',
          status: 'NOT_FOUND'
        });
      } else {
        callback(null, response);
      }
    } catch (error) {
      console.error('Error in GetMostPopularSongsAllTime:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetSongPopularity: async (call, callback) => {
    const { title } = call.request;
    console.log(`Received title query: "${title}"`);

    try {
      // Aggregation pipeline to find matching songs and compute play counts
      const pipeline = [
        {
          $addFields: {
            totalPlayCount: { $sum: '$plays.count' }
          }
        },
        {
          $setWindowFields: {
            sortBy: { totalPlayCount: -1 },
            output: {
              rank: {
                $rank: {}
              }
            }
          }
        },
        {
          $match: {
            title: { $regex: `^${title}`, $options: 'i' }
          }
        },
        {
          $project: {
            _id: 0,
            songId: '$_id',
            title: '$title',
            artist: '$artist',
            play_count: '$totalPlayCount',
            rank: 1
          }
        }
      ];

      const results = await Song.aggregate(pipeline);

      if (results.length === 0) {
        console.log('No songs found, returning NOT_FOUND error');
        return callback({
          code: 404,
          message: 'No songs found',
          status: 'NOT_FOUND'
        });
      }

      const response = {
        rankings: results
      };

      callback(null, response);
    } catch (error) {
      console.error('Error in GetSongPopularity:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetMostPopularAlbumsMonthly: async (call, callback) => {
    const { limit, offset } = call.request;
    console.log(`Received request with limit: ${limit}, offset: ${offset}`);

    try {
      let aggregationPipeline = [
        { $unwind: '$plays' },
        {
          $group: {
            _id: { albumId: '$_id', month: '$plays.month' },
            name: { $first: '$name' },
            artist: { $first: '$artist' },
            playCount: { $first: '$plays.count' }
          }
        },
        { $sort: { playCount: -1, name: 1 } },
        {
          $group: {
            _id: '$_id.month',
            albums: {
              $push: {
                name: '$name',
                artist: '$artist',
                play_count: '$playCount'
              }
            },
            maxPlayCount: { $max: '$playCount' }
          }
        },
        { $sort: { "_id": -1 } },
        {
          $project: {
            _id: 0,
            month: '$_id',
            albums: {
              $map: {
                input: { $slice: ['$albums', offset, limit] },
                in: {
                  $mergeObjects: [
                    '$$this',
                    {
                      rank: { $add: [{ $indexOfArray: ['$albums', '$$this'] }, 1] }
                    }
                  ]
                }
              }
            }
          }
        }
      ];

      const result = await Album.aggregate(aggregationPipeline);

      let response = {
        months: result.reduce((acc, { month, albums }) => {
          acc[month] = { albums };
          return acc;
        }, {})
      };

      if (Object.keys(response.months || {}).length === 0) {
        console.error('Empty response generated. Check MongoDB query and data.');
        return callback({
          code: 404,
          message: 'No albums found',
          status: 'NOT_FOUND'
        });
      } else
        callback(null, response);
    } catch (error) {
      console.error('Error in GetMostPopularAlbumsMonthly:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetMostPopularAlbumsAllTime: async (call, callback) => {
    const { limit, offset } = call.request;
    console.log(`Received request with limit: ${limit}, offset: ${offset}`);

    try {
      let aggregationPipeline = [
        { $unwind: '$plays' },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            artist: { $first: '$artist' },
            totalPlays: { $sum: '$plays.count' }
          }
        },
        { $sort: { totalPlays: -1, name: 1 } },
        { $skip: offset },
        { $limit: limit },
        {
          $group: {
            _id: null,
            albums: { $push: '$$ROOT' },
            maxPlayCount: { $max: '$totalPlays' }
          }
        },
        { $unwind: { path: '$albums', includeArrayIndex: 'index' } },
        {
          $project: {
            _id: 0,
            name: '$albums.name',
            artist: '$albums.artist',
            play_count: '$albums.totalPlays',
            rank: { $add: ['$index', 1] }
          }
        }
      ];

      const result = await Album.aggregate(aggregationPipeline);
      let response = { albums: result };

      if (!response.albums || response.albums.length === 0) {
        return callback({
          code: 404,
          message: 'No albums found',
          status: 'NOT_FOUND'
        });
      } else
        callback(null, response);
    } catch (error) {
      console.error('Error in GetMostPopularAlbumsAllTime:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetAlbumPopularity: async (call, callback) => {
    const { name } = call.request;
    console.log(`Received name query: "${name}"`);

    try {
      // Aggregation pipeline to find matching albums and compute play counts
      const pipeline = [
        {
          $addFields: {
            totalPlayCount: { $sum: '$plays.count' }
          }
        },
        {
          $setWindowFields: {
            sortBy: { totalPlayCount: -1 },
            output: {
              rank: {
                $rank: {}
              }
            }
          }
        },
        {
          $match: {
            name: { $regex: `^${name}`, $options: 'i' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$name',
            artist: '$artist',
            play_count: '$totalPlayCount',
            rank: 1
          }
        }
      ];

      const results = await Album.aggregate(pipeline);

      if (results.length === 0) {
        console.log('No albums found, returning NOT_FOUND error');
        return callback({
          code: 404,
          message: 'No albums found',
          status: 'NOT_FOUND'
        });
      }

      const response = {
        rankings: results
      };

      callback(null, response);
    } catch (error) {
      console.error('Error in GetAlbumPopularity:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetMostPopularArtistsMonthly: async (call, callback) => {
    const { limit = 10, offset = 0 } = call.request;
    console.log(`Received request with limit: ${limit}, offset: ${offset}`);

    try {
      let aggregationPipeline = [
        { $unwind: '$plays' },
        {
          $group: {
            _id: { artistId: '$_id', month: '$plays.month' },
            name: { $first: '$name' },
            playCount: { $sum: '$plays.count' }
          }
        },
        {
          $group: {
            _id: '$_id.month',
            artists: {
              $push: {
                name: '$name',
                play_count: '$playCount'
              }
            }
          }
        },
        { $sort: { "_id": -1 } },
        {
          $project: {
            _id: 0,
            month: '$_id',
            artists: {
              $map: {
                input: { $slice: [{ $sortArray: { input: '$artists', sortBy: { play_count: -1 } } }, offset, limit] },
                as: 'artist',
                in: {
                  $mergeObjects: [
                    '$$artist',
                    { rank: { $add: [{ $indexOfArray: [{ $sortArray: { input: '$artists', sortBy: { play_count: -1 } } }, '$$artist'] }, 1] } }
                  ]
                }
              }
            }
          }
        }
      ];

      const result = await Artist.aggregate(aggregationPipeline);

      let response = {
        months: result.reduce((acc, { month, artists }) => {
          acc[month] = { artists };
          return acc;
        }, {})
      };

      if (Object.keys(response.months || {}).length === 0) {
        console.error('Empty response generated. Check MongoDB query and data.');
        return callback({
          code: 404,
          message: 'No artists found',
          status: 'NOT_FOUND'
        });
      } else {
        callback(null, response);
      }
    } catch (error) {
      console.error('Error in GetMostPopularArtistsMonthly:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetMostPopularArtistsAllTime: async (call, callback) => {
    const { limit = 10, offset = 0 } = call.request;
    console.log(`Received request with limit: ${limit}, offset: ${offset}`);

    try {
      let aggregationPipeline = [
        { $unwind: '$plays' },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            totalPlays: { $sum: '$plays.count' }
          }
        },
        { $sort: { totalPlays: -1, name: 1 } },
        {
          $group: {
            _id: null,
            artists: { $push: '$$ROOT' }
          }
        },
        {
          $project: {
            _id: 0,
            artists: {
              $map: {
                input: { $slice: ['$artists', offset, limit] },
                as: 'artist',
                in: {
                  name: '$$artist.name',
                  play_count: '$$artist.totalPlays',
                  rank: { $add: [{ $indexOfArray: ['$artists', '$$artist'] }, 1] }
                }
              }
            }
          }
        }
      ];

      const result = await Artist.aggregate(aggregationPipeline);

      if (!result || result.length === 0 || result[0].artists.length === 0) {
        return callback({
          code: 404,
          message: 'No artists found',
          status: 'NOT_FOUND'
        });
      } else {
        callback(null, result[0]);
      }
    } catch (error) {
      console.error('Error in GetMostPopularArtistsAllTime:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  GetArtistPopularity: async (call, callback) => {
    const { name } = call.request;
    console.log(`Received name query: "${name}"`);

    try {
      // Aggregation pipeline to find matching artists and compute play counts
      const pipeline = [
        {
          $addFields: {
            totalPlayCount: {
              $cond: {
                if: { $isArray: "$plays" },
                then: { $sum: "$plays.count" },
                else: 0
              }
            }
          }
        },
        {
          $setWindowFields: {
            sortBy: { totalPlayCount: -1 },
            output: {
              rank: {
                $rank: {}
              }
            }
          }
        },
        {
          $match: {
            name: { $regex: name, $options: 'i' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$name',
            play_count: '$totalPlayCount',
            rank: 1
          }
        }
      ];

      const results = await Artist.aggregate(pipeline);

      if (results.length === 0) {
        console.log('No artists found, returning NOT_FOUND error');
        return callback({
          code: 404,
          message: 'No artists found',
          status: 'NOT_FOUND'
        });
      }

      const response = {
        rankings: results
      };

      callback(null, response);
    } catch (error) {
      console.error('Error in GetArtistPopularity:', error);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  }
};

module.exports = popularityService;