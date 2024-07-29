const { Song, Album, Artist } = require('./db');
const grpc = require('@grpc/grpc-js');
const moment = require('moment');
const { Round, MonthToNumber } = require('../../../utils/commonUtils');

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
      const totalPlaysResult = await Song.aggregate([
        { $unwind: '$plays' },
        { $group: { _id: null, total: { $sum: '$plays.count' } } }
      ]);

      const totalPlays = totalPlaysResult.length > 0 ? totalPlaysResult[0].total : 0;
      const songCount = await Song.countDocuments();

      const topArtists = await Artist.aggregate([
        {
          $lookup: {
            from: 'songs',
            localField: 'name',
            foreignField: 'artist',
            as: 'songs'
          }
        },
        { $unwind: '$songs' },
        { $unwind: '$songs.plays' },
        {
          $group: {
            _id: { artistId: '$_id', month: '$songs.plays.month' },
            name: { $first: '$name' },
            monthlyPlays: { $sum: '$songs.plays.count' },
            songs: {
              $push: {
                song_id: '$songs._id',
                title: '$songs.title',
                plays: '$songs.plays.count'
              }
            }
          }
        },
        {
          $group: {
            _id: '$_id.artistId',
            name: { $first: '$name' },
            monthlyData: {
              $push: {
                month: '$_id.month',
                plays: '$monthlyPlays',
                songs: '$songs'
              }
            },
            total_plays: { $sum: '$monthlyPlays' }
          }
        },
        { $sort: { total_plays: -1 } },
        { $limit: 10 }
      ]);

      const result = {
        total_plays: totalPlays,
        average_plays_per_song: Round((totalPlays / songCount), 3),
        top_artists: topArtists.map(artist => {
          const months = artist.monthlyData.map(d => d.month).sort();
          const firstMonthPlays = artist.monthlyData.find(d => d.month === months[0]).plays;
          const lastMonthPlays = artist.monthlyData.find(d => d.month === months[months.length - 1]).plays;
          const growthRatePerMonth = months.length > 1
            ? (lastMonthPlays - firstMonthPlays) / firstMonthPlays / (months.length - 1)
            : 0;

          const songData = artist.monthlyData.reduce((acc, month) => {
            month.songs.forEach(song => {
              if (!acc[song.song_id]) {
                acc[song.song_id] = { title: song.title, monthlyPlays: {} };
              }
              acc[song.song_id].monthlyPlays[month.month] = song.plays;
            });
            return acc;
          }, {});

          const topSongs = Object.entries(songData)
            .map(([song_id, data]) => {
              const songMonths = Object.keys(data.monthlyPlays).sort();
              const totalPlays = Object.values(data.monthlyPlays).reduce((sum, plays) => sum + plays, 0);
              const firstMonthPlays = data.monthlyPlays[songMonths[0]];
              const lastMonthPlays = data.monthlyPlays[songMonths[songMonths.length - 1]];
              const songGrowthRate = songMonths.length > 1
                ? (lastMonthPlays - firstMonthPlays) / firstMonthPlays / (songMonths.length - 1)
                : 0;

              return {
                title: data.title,
                plays: Round(totalPlays, 3),
                growth_rate_per_month: Round(songGrowthRate, 3)
              };
            })
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 10);

          return {
            name: artist.name,
            total_plays: Round(artist.total_plays, 3),
            average_plays_per_song: Round((artist.total_plays / artist.monthlyData.reduce((sum, month) => sum + month.songs.length, 0)), 3),
            growth_rate_per_month: Round(growthRatePerMonth, 3),
            top_songs: topSongs
          };
        })
      };

      callback(null, result);
    } catch (error) {
      console.error('Error in GetOverallTrends:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Internal server error"
      });
    }
  },

  GetTrendsByPeriod: async (call, callback) => {
    const { start_month, end_month } = call.request;
    try {
      const startMonthNumber = MonthToNumber(start_month);
      const endMonthNumber = MonthToNumber(end_month);

      const totalPlaysResult = await Song.aggregate([
        { $unwind: '$plays' },
        {
          $addFields: {
            'plays.monthNumber': {
              $indexOfArray: [
                ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
                { $toLower: '$plays.month' }
              ]
            }
          }
        },
        {
          $match: {
            'plays.monthNumber': {
              $gte: startMonthNumber,
              $lte: endMonthNumber
            }
          }
        },
        {
          $group: {
            _id: null,
            totalPlays: { $sum: '$plays.count' }
          }
        }
      ]);

      console.log(`Total plays result: ${JSON.stringify(totalPlaysResult)}`);

      const totalPlays = totalPlaysResult.length > 0 ? totalPlaysResult[0].totalPlays : 0;
      const songCount = await Song.countDocuments();

      const topArtists = await Artist.aggregate([
        {
          $lookup: {
            from: 'songs',
            localField: 'name',
            foreignField: 'artist',
            as: 'songs'
          }
        },
        { $unwind: '$songs' },
        { $unwind: '$songs.plays' },
        {
          $addFields: {
            'songs.plays.monthNumber': {
              $indexOfArray: [
                ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
                { $toLower: '$songs.plays.month' }
              ]
            }
          }
        },
        {
          $match: {
            'songs.plays.monthNumber': {
              $gte: startMonthNumber,
              $lte: endMonthNumber
            }
          }
        },
        {
          $group: {
            _id: { artistId: '$_id', month: '$songs.plays.month' },
            name: { $first: '$name' },
            monthlyPlays: { $sum: '$songs.plays.count' },
            songs: {
              $push: {
                song_id: '$songs._id',
                title: '$songs.title',
                plays: '$songs.plays.count'
              }
            }
          }
        },
        {
          $group: {
            _id: '$_id.artistId',
            name: { $first: '$name' },
            monthlyData: {
              $push: {
                month: '$_id.month',
                plays: '$monthlyPlays',
                songs: '$songs'
              }
            },
            total_plays: { $sum: '$monthlyPlays' }
          }
        },
        { $sort: { total_plays: -1 } },
        { $limit: 10 }
      ]);

      const result = {
        start_month,
        end_month,
        total_plays: Round(totalPlays, 3),
        average_plays_per_song: Round((totalPlays / songCount), 3),
        top_artists: topArtists.map(artist => {
          const months = artist.monthlyData.map(d => d.month).sort();
          const firstMonthPlays = artist.monthlyData.find(d => d.month === months[0]).plays;
          const lastMonthPlays = artist.monthlyData.find(d => d.month === months[months.length - 1]).plays;
          const growthRatePerMonth = months.length > 1
            ? (lastMonthPlays - firstMonthPlays) / firstMonthPlays / (months.length - 1)
            : 0;

          const songData = artist.monthlyData.reduce((acc, month) => {
            month.songs.forEach(song => {
              if (!acc[song.song_id]) {
                acc[song.song_id] = { title: song.title, monthlyPlays: {} };
              }
              acc[song.song_id].monthlyPlays[month.month] = song.plays;
            });
            return acc;
          }, {});

          const topSongs = Object.entries(songData)
            .map(([song_id, data]) => {
              const songMonths = Object.keys(data.monthlyPlays).sort();
              const totalPlays = Object.values(data.monthlyPlays).reduce((sum, plays) => sum + plays, 0);
              const firstMonthPlays = data.monthlyPlays[songMonths[0]];
              const lastMonthPlays = data.monthlyPlays[songMonths[songMonths.length - 1]];
              const songGrowthRate = songMonths.length > 1
                ? (lastMonthPlays - firstMonthPlays) / firstMonthPlays / (songMonths.length - 1)
                : 0;

              return {
                title: data.title,
                plays: Round(totalPlays, 3),
                growth_rate_per_month: Round(songGrowthRate, 3)
              };
            })
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 10);

          return {
            name: artist.name,
            total_plays: Round(artist.total_plays, 3),
            average_plays_per_song: Round((artist.total_plays / artist.monthlyData.reduce((sum, month) => sum + month.songs.length, 0)), 3),
            growth_rate_per_month: Round(growthRatePerMonth, 3),
            top_songs: topSongs
          };
        })
      };

      callback(null, result);
    } catch (error) {
      console.error('Error in GetTrendsByPeriod:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Internal server error"
      });
    }
  },

  GetTrendingSongs: async (call, callback) => {
    const { months } = call.request;
    try {
      const currentMonth = moment().month();
      const monthsToInclude = Array.from({ length: months }, (_, i) => moment().month(currentMonth - 1 - i).format('MMMM'));

      const trendingSongs = await Song.aggregate([
        { $unwind: '$plays' },
        { $match: { 'plays.month': { $in: monthsToInclude } } },
        {
          $group: {
            _id: { title: '$title', artist: '$artist' },
            monthlyPlays: { $push: { month: '$plays.month', count: '$plays.count' } },
            totalPlays: { $sum: '$plays.count' }
          }
        },
        {
          $project: {
            title: '$_id.title',
            artist: '$_id.artist',
            totalPlays: 1,
            monthlyPlays: 1,
            growthRate: {
              $cond: [
                { $gt: [{ $size: '$monthlyPlays' }, 1] },
                {
                  $divide: [
                    {
                      $subtract: [
                        { $arrayElemAt: ['$monthlyPlays.count', -1] },
                        { $arrayElemAt: ['$monthlyPlays.count', 0] }
                      ]
                    },
                    {
                      $cond: [
                        { $eq: [{ $arrayElemAt: ['$monthlyPlays.count', 0] }, 0] },
                        1, // Avoid division by zero
                        { $arrayElemAt: ['$monthlyPlays.count', 0] }
                      ]
                    }
                  ]
                },
                0
              ]
            }
          }
        },
        { $sort: { growthRate: -1 } },
        { $limit: 10 } // Ensure we only get the top 10 songs
      ]);

      const roundedTrendingSongs = trendingSongs.map(song => ({
        title: song.title,
        artist: song.artist,
        total_plays: song.totalPlays,
        growth_rate_per_month: Round(song.growthRate, 3)
      }));

      callback(null, { songs: roundedTrendingSongs });
    } catch (error) {
      console.error('Error in GetTrendingSongs:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Internal server error"
      });
    }
  },

  GetTrendingArtists: async (call, callback) => {
    const { months } = call.request; 
    try {
      const currentMonth = moment().month();
      const monthsToInclude = Array.from({ length: months }, (_, i) => moment().month(currentMonth - 1 - i).format('MMMM'));
  
      const trendingArtists = await Artist.aggregate([
        { $unwind: '$plays' },
        { $match: { 'plays.month': { $in: monthsToInclude } } },
        {
          $group: {
            _id: '$name',
            monthlyPlays: { $push: { month: '$plays.month', count: '$plays.count' } },
            totalPlays: { $sum: '$plays.count' }
          }
        },
        {
          $project: {
            name: '$_id',
            totalPlays: 1,
            monthlyPlays: 1,
            growthRate: {
              $cond: [
                { $gt: [{ $size: '$monthlyPlays' }, 1] },
                {
                  $divide: [
                    {
                      $subtract: [
                        { $arrayElemAt: ['$monthlyPlays.count', -1] },
                        { $arrayElemAt: ['$monthlyPlays.count', 0] }
                      ]
                    },
                    {
                      $cond: [
                        { $eq: [{ $arrayElemAt: ['$monthlyPlays.count', 0] }, 0] },
                        1, // Avoid division by zero
                        { $arrayElemAt: ['$monthlyPlays.count', 0] }
                      ]
                    }
                  ]
                },
                0
              ]
            }
          }
        },
        { $sort: { growthRate: -1 } },
        { $limit: 10 } // Ensure we only get the top 10 artists
      ]);
  
      const roundedTrendingArtists = trendingArtists.map(artist => ({
        name: artist.name,
        total_plays: artist.totalPlays,
        growth_rate_per_month: Round(artist.growthRate, 3)
      }));
  
      callback(null, { artists: roundedTrendingArtists });
    } catch (error) {
      console.error('Error in GetTrendingArtists:', error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Internal server error"
      });
    }
  }  
};

module.exports = trendService;