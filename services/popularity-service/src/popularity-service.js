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
          code: 404,
          message: 'No songs found',
          status: 'NOT_FOUND'
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
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
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

      // Aggregate play counts across all months for each album
      const albumPlayCounts = allAlbums.map(album => {
        const totalPlayCount = album.plays && album.plays.length > 0
          ? album.plays.reduce((sum, play) => {
            return sum + play._doc.count;
          }, 0)
          : 0;
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

      callback(null, response);
    } catch (error) {
      console.error('Error in GetMostPopularAlbums:', error);
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
      // Find albums that match the name query
      const matchingAlbums = await Album.find({
        name: { $regex: `^${name}`, $options: 'i' }
      });

      console.log(`Found ${matchingAlbums.length} albums matching the query`);
      console.log('Matching albums:', matchingAlbums.map(a => a._doc.name));

      if (matchingAlbums.length === 0) {
        console.log('No albums found, returning NOT_FOUND error');
        return callback({
          code: 404,
          message: 'No albums found',
          status: 'NOT_FOUND'
        });
      }

      // Fetch all albums
      const allAlbums = await Album.find();

      console.log(`Found ${allAlbums.length} albums in total`);

      // Aggregate play counts across all months for each album
      const albumPlayCounts = allAlbums.map(album => {
        const totalPlayCount = album.plays ? album.plays.reduce((sum, play) => sum + play._doc.count, 0) : 0;
        return {
          name: album._doc.name,
          artist: album._doc.artist || '',
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
        matchingAlbums.some(ma => ma._doc.name === album.name)
      );

      const response = {
        rankings: filteredAlbumPlayCounts.map(album => ({
          name: album.name,
          artist: album.artist,
          play_count: album.totalPlayCount,
          rank: album.rank
        }))
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

  GetMostPopularArtists: async (call, callback) => {
    const { period, limit = 10, offset = 0 } = call.request;
    console.log(`Received request with period: "${period}", limit: ${limit}, offset: ${offset}`);

    try {
      // Fetch all artists
      const allArtists = await Artist.find();
      console.log(`Found ${allArtists.length} artists in total`);

      // Aggregate play counts across all months for each album
      const artistPlayCounts = allArtists.map(artist => {
        const totalPlayCount = artist.plays && artist.plays.length > 0
          ? artist.plays.reduce((sum, play) => {
            return sum + play._doc.count;
          }, 0)
          : 0;
        return {
          name: artist._doc.name,
          artist: artist._doc.artist || '',
          totalPlayCount
        };
      });

      // Sort artists by total play count and add rank
      artistPlayCounts.sort((a, b) => b.totalPlayCount - a.totalPlayCount);
      artistPlayCounts.forEach((artist, index) => {
        artist.rank = index + 1;
      });

      // Paginate the results
      const paginatedArtists = artistPlayCounts.slice(offset, offset + limit);

      const response = {
        artists: paginatedArtists.map(artist => ({
          name: artist.name,
          play_count: artist.totalPlayCount,
          rank: artist.rank
        })),
        total_count: allArtists.length
      };

      callback(null, response);
    } catch (error) {
      console.error('Error in GetMostPopularArtists:', error);
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
      // Find artists that match the name query
      const matchingArtists = await Artist.find({
        name: { $regex: name, $options: 'i' }  // Changed to match any occurrence of the name
      });  

      console.log(`Found ${matchingArtists.length} artists matching the query`);
      console.log('Matching artists:', matchingArtists.map(a => a._doc.name));

      if (matchingArtists.length === 0) {
        console.log('No artists found, returning NOT_FOUND error');
        return callback({
          code: 404,
          message: 'No artists found',
          status: 'NOT_FOUND'
        });
      }

      // Fetch all artists
      const allArtists = await Artist.find();

      console.log(`Found ${allArtists.length} artists in total`);

      // Aggregate play counts across all months for each artist
      const artistPlayCounts = allArtists.map(artist => {
        const totalPlayCount = artist.plays ? artist.plays.reduce((sum, play) => sum + play._doc.count, 0) : 0;
        return {
          name: artist._doc.name,
          totalPlayCount
        };
      });

      // Sort artists by total play count and add rank
      artistPlayCounts.sort((a, b) => b.totalPlayCount - a.totalPlayCount);
      artistPlayCounts.forEach((artist, index) => {
        artist.rank = index + 1;
      });

      // Filter the artist play counts to include only the matching artists
      const filteredArtistPlayCounts = artistPlayCounts.filter(album =>
        matchingArtists.some(ma => ma._doc.name === album.name)
      );

      const response = {
        rankings: filteredArtistPlayCounts.map(artist => ({
          name: artist.name,
          play_count: artist.totalPlayCount,
          rank: artist.rank
        }))
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
  }
};

module.exports = popularityService;