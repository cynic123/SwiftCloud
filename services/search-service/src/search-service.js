const { Song } = require('./db');

const searchService = {
  HealthCheck: async (call, callback) => {
    try {
      callback(null, { status: 'Welcome to Search Service!' });
    } catch (err) {
      console.error('Health check error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  AdvancedSearch: async (call, callback) => {
    const { query, filters, sort, limit, offset } = call.request;
    try {
      console.log('Received request:', JSON.stringify(call.request, null, 2));
  
      let searchQuery = {};
      let scoreQuery = [];
      
      if (query && query.trim() !== '') {
        searchQuery.$or = [
          { title: { $regex: query, $options: 'i' } },
          { artist: { $regex: query, $options: 'i' } },
          { album: { $regex: query, $options: 'i' } },
          { writers: { $elemMatch: { $regex: query, $options: 'i' } } }
        ];
        scoreQuery = [
          { $cond: [{ $regexMatch: { input: '$title', regex: query, options: 'i' } }, 1, 0] },
          { $cond: [{ $regexMatch: { input: '$artist', regex: query, options: 'i' } }, 1, 0] },
          { $cond: [{ $regexMatch: { input: '$album', regex: query, options: 'i' } }, 1, 0] },
          { $cond: [{ $gt: [{ $size: { $filter: { input: '$writers', cond: { $regexMatch: { input: '$$this', regex: query, options: 'i' } } } } }, 0] }, 1, 0] }
        ];
      }
      
      // Apply filters
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          switch (filter.operator) {
            case 'eq':
              searchQuery[filter.field] = filter.value;
              break;
            case 'gte':
              searchQuery[filter.field] = { $gte: parseInt(filter.value) };
              break;
            case 'lte':
              searchQuery[filter.field] = { $lte: parseInt(filter.value) };
              break;
            case 'contains':
              if (filter.field === 'writers') {
                searchQuery[filter.field] = { $elemMatch: { $regex: filter.value, $options: 'i' } };
              } else {
                searchQuery[filter.field] = { $regex: filter.value, $options: 'i' };
              }
              break;
          }
        });
      }
  
      console.log('Constructed searchQuery:', JSON.stringify(searchQuery, null, 2));
  
      let sortOption = {};
      if (sort && sort.field) {
        sortOption[sort.field] = sort.order === 'desc' ? -1 : 1;
      }
  
      console.log('Sort option:', JSON.stringify(sortOption, null, 2));
  
      const aggregationPipeline = [
        { $match: searchQuery },
        { $addFields: { 
          relevance_score: query && query.trim() !== '' 
            ? { $divide: [{ $sum: scoreQuery }, scoreQuery.length] }
            : 1
        }},
        { $sort: sortOption.year ? sortOption : { relevance_score: -1 } },
        { $skip: offset },
        { $limit: limit }
      ];
  
      const songs = await Song.aggregate(aggregationPipeline);
  
      console.log(`Found ${songs.length} songs`);
  
      console.log(`Total results: ${songs.length}`);
  
      const formattedResults = songs.map(song => ({
        id: song._id.toString(),
        title: song.title,
        artist: song.artist,
        writers: song.writers,
        album: song.album,
        year: song.year,
        plays: song.plays,
        relevance_score: song.relevance_score
      }));
  
      callback(null, { results: formattedResults, total_results: songs.length });
    } catch (err) {
      console.error('Advanced search error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  Autocomplete: async (call, callback) => {
    const { query, limit = 5 } = call.request;
    try {
      // Use a case-insensitive regex that matches at the beginning of the string
      const regexPattern = new RegExp(`^${query}`, 'i');
      const suggestions = await Song.aggregate([
        {
          $match: {
            $or: [
              { title: regexPattern },
              { artist: regexPattern },
              { album: regexPattern },
              { writers: regexPattern }
            ]
          }
        },
        {
          $project: {
            suggestions: [
              { $cond: [{ $regexMatch: { input: "$title", regex: regexPattern } }, { value: "$title", type: "title" }, null] },
              { $cond: [{ $regexMatch: { input: "$artist", regex: regexPattern } }, { value: "$artist", type: "artist" }, null] },
              { $cond: [{ $regexMatch: { input: "$album", regex: regexPattern } }, { value: "$album", type: "album" }, null] },
              { $map: {
                input: "$writers",
                as: "writer",
                in: { $cond: [{ $regexMatch: { input: "$$writer", regex: regexPattern } }, { value: "$$writer", type: "writer" }, null] }
              } }
            ]
          }
        },
        { $unwind: "$suggestions" },
        { $unwind: "$suggestions" },
        { $match: { "suggestions": { $ne: null } } },
        {
          $group: {
            _id: { value: "$suggestions.value", type: "$suggestions.type" },
            suggestion: { $first: "$suggestions" }
          }
        },
        { $replaceRoot: { newRoot: "$suggestion" } },
        { $sort: { value: 1 } },
        { $limit: limit }
      ]);

      callback(null, { suggestions });
    } catch (err) {
      console.error('Autocomplete error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  }
};

module.exports = searchService;