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
              rank: { $add: ['$index', 1] }
            }
          }
        ];
      }

      const result = await Song.aggregate(aggregationPipeline);

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

      if (Object.keys(response.months || {}).length === 0 && (!response.songs || response.songs.length === 0)) {
        console.error('Empty response generated. Check MongoDB query and data.');
        callback(new Error('No data found'), null);
      } else {
        callback(null, response);
      }
    } catch (error) {
      console.error('Error in GetMostPopularSongs:', error);
      callback(error, null);
    }
  },

  GetSongPopularity: async (call, callback) => {
    const { title } = call.request;
    console.log(`Received title query: "${title}"`);

    try {
      // Find songs that match the title query
      const matchingSongs = await Song.find({
        title: { $regex: `^${title}`, $options: 'i' }
      });

      console.log(`Found ${matchingSongs.length} songs matching the query`);
      console.log('Matching songs:', matchingSongs.map(s => s.title));

      if (matchingSongs.length === 0) {
        console.log('No songs found, returning NOT_FOUND error');
        return callback({
          code: grpc.status.NOT_FOUND,
          details: "No songs found"
        });
      }

      // Fetch all songs
      const allSongs = await Song.find();

      console.log(`Found ${allSongs.length} songs in total`);

      // Aggregate play counts across all months for each song
      const songPlayCounts = allSongs.map(song => {
        const totalPlayCount = song.plays.reduce((sum, play) => sum + play.count, 0);
        return {
          songId: song._id.toString(),
          title: song.title,
          artist: song.artist,
          totalPlayCount
        };
      });

      // Sort songs by total play count and add rank
      songPlayCounts.sort((a, b) => b.totalPlayCount - a.totalPlayCount);
      songPlayCounts.forEach((song, index) => {
        song.rank = index + 1;
      });

      // Filter the song play counts to include only the matching songs
      const filteredSongPlayCounts = songPlayCounts.filter(song =>
        matchingSongs.some(ms => ms._id.toString() === song.songId)
      );

      // Ensure playCount is included in the response
      const response = {
        rankings: filteredSongPlayCounts.map(song => ({
          songId: song.songId,
          title: song.title,
          artist: song.artist,
          play_count: song.totalPlayCount, // Ensure play_count is correctly set
          rank: song.rank
        }))
      };

      callback(null, response);
    } catch (error) {
      console.error('Error in GetSongPopularity:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Internal server error"
      });
    }
  },

  GetMostPopularAlbums: async (call, callback) => {
    const { period, limit = 10, offset = 0 } = call.request;
    console.log(`Received request with period: "${period}", limit: ${limit}, offset: ${offset}`);
  
    try {
      // Fetch all albums
      const allAlbums = await Album.find();
      console.log(`Found ${allAlbums.length} albums in total`);
  
      // Log the structure of fetched albums
      allAlbums.forEach(album => {
        console.log(`Album Document: ${JSON.stringify(album._doc, null, 2)}`);
        console.log(`Album Name Direct Access: ${album._doc.name}`);
      });
  
      // Aggregate play counts across all months for each album
      const albumPlayCounts = allAlbums.map(album => {
        const totalPlayCount = album.plays && album.plays.length > 0 
          ? album.plays.reduce((sum, play) => {
              console.log(`Processing play for album ${album._doc.name}: month=${play._doc.month}, count=${play._doc.count}`);
              return sum + play._doc.count;
            }, 0)
          : 0;
        console.log(`Album: ${album._doc.name}, Total Play Count: ${totalPlayCount}`);
        return {
          name: album._doc.name,
          artist: album._doc.artist || '',
          writers: album._doc.writers || [],
          totalPlayCount
        };
      });
  
      // Sort albums by total play count and add rank
      albumPlayCounts.sort((a, b) => b.totalPlayCount - a.totalPlayCount);
      albumPlayCounts.forEach((album, index) => {
        album.rank = index + 1;
      });
  
      // Paginate the results
      const paginatedAlbums = albumPlayCounts.slice(offset, offset + limit);
  
      const response = {
        albums: paginatedAlbums.map(album => ({
          name: album.name,
          artist: album.artist,
          writers: album.writers,
          play_count: album.totalPlayCount,
          rank: album.rank
        })),
        total_count: allAlbums.length
      };
  
      console.log("Response:", JSON.stringify(response, null, 2));
  
      callback(null, response);
    } catch (error) {
      console.error('Error in GetMostPopularAlbums:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Internal server error"
      });
    }
  },

  GetAlbumPopularity: async (call, callback) => {
    console.log('GetAlbumPopularity method called');
    const { name } = call.request;
    console.log(`Received name query: "${name}"`);

    try {
      // Find albums that match the name query
      const matchingAlbums = await Album.find({
        title: { $regex: `^${name}`, $options: 'i' }
      });

      console.log(`Found ${matchingAlbums.length} albums matching the query`);
      console.log('Matching albums:', matchingAlbums.map(a => a.title));

      if (matchingAlbums.length === 0) {
        console.log('No albums found, returning NOT_FOUND error');
        return callback({
          code: grpc.status.NOT_FOUND,
          details: "No albums found"
        });
      }

      // Fetch all albums
      const allAlbums = await Album.find();

      console.log(`Found ${allAlbums.length} albums in total`);

      // Aggregate play counts across all months for each album
      const albumPlayCounts = allAlbums.map(album => {
        const totalPlayCount = album.plays ? album.plays.reduce((sum, play) => sum + play.count, 0) : 0;
        console.log(`Album: ${album.name}, Total Play Count: ${totalPlayCount}`);
        return {
          name: album.name,
          artist: album.artist || '',
          totalPlayCount
        };
      });

      // Sort albums by total play count and add rank
      albumPlayCounts.sort((a, b) => b.totalPlayCount - a.totalPlayCount);
      albumPlayCounts.forEach((album, index) => {
        album.rank = index + 1;
      });

      // Filter the album play counts to include only the matching albums
      const filteredAlbumPlayCounts = albumPlayCounts.filter(album =>
        matchingAlbums.some(ma => ma._id.toString() === album._id.toString())
      );

      // Ensure playCount is included in the response
      const response = {
        album_popularity: filteredAlbumPlayCounts.map(album => ({
          name: album.name,
          artist: album.artist,
          play_count: album.totalPlayCount, // Ensure play_count is correctly set
          rank: album.rank
        }))
      };

      console.log('Response:', JSON.stringify(response, null, 2));

      callback(null, response);
    } catch (error) {
      console.error('Error in GetAlbumPopularity:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Internal server error"
      });
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