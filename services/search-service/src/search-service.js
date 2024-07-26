const { Song, Album, Artist } = require('./db');

const searchService = {
  Search: async (call, callback) => {
    const { query, limit = 10, offset = 0 } = call.request;
    try {
      const searchQuery = { $text: { $search: query } };

      const songs = await Song.find(
        searchQuery,
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .skip(offset)
        .limit(limit)
        .lean();

      const totalResults = await Song.countDocuments(searchQuery);

      const formattedResults = songs.map(song => ({
        id: song._id.toString(),
        type: "song",
        title: song.title,
        artist: song.artist,
        album: song.album,
        year: song.year,
        relevance_score: song.score
      }));

      callback(null, { results: formattedResults, total_results: totalResults });
    } catch (err) {
      console.error('Search error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  SearchSongs: async (call, callback) => {
    const { query, limit, offset } = call.request;
    try {
      const songs = await Song.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).skip(offset).limit(limit);

      const total_results = await Song.countDocuments({ $text: { $search: query } });

      callback(null, { songs, total_results });
    } catch (error) {
      callback(error);
    }
  },

  SearchAlbums: async (call, callback) => {
    const { query, limit, offset } = call.request;
    try {
      const albums = await Album.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).skip(offset).limit(limit);

      const total_results = await Album.countDocuments({ $text: { $search: query } });

      callback(null, { albums, total_results });
    } catch (error) {
      callback(error);
    }
  },

  SearchArtists: async (call, callback) => {
    const { query, limit, offset } = call.request;
    try {
      const artists = await Artist.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).skip(offset).limit(limit);

      const total_results = await Artist.countDocuments({ $text: { $search: query } });

      callback(null, { artists, total_results });
    } catch (error) {
      callback(error);
    }
  },

  AdvancedSearch: async (call, callback) => {
    const { query, filters, sort, limit = 10, offset = 0 } = call.request;
    try {
      let searchQuery = query ? { $text: { $search: query } } : {};
      
      // Apply filters
      filters.forEach(filter => {
        switch (filter.operator) {
          case 'eq':
            searchQuery[filter.field] = filter.value;
            break;
          case 'gte':
            searchQuery[filter.field] = { $gte: filter.value };
            break;
          case 'lte':
            searchQuery[filter.field] = { $lte: filter.value };
            break;
          // Add more operators as needed
        }
      });

      let sortOption = {};
      if (sort && sort.field) {
        sortOption[sort.field] = sort.order === 'desc' ? -1 : 1;
      }
      if (query) {
        sortOption.score = { $meta: "textScore" };
      }

      const results = await Song.find(
        searchQuery,
        { score: { $meta: "textScore" } }
      )
        .sort(sortOption)
        .skip(offset)
        .limit(limit)
        .lean();

      const totalResults = await Song.countDocuments(searchQuery);

      const formattedResults = results.map(result => ({
        id: result._id.toString(),
        type: "song",
        title: result.title,
        artist: result.artist,
        album: result.album,
        year: result.year,
        relevance_score: result.score || 0
      }));

      callback(null, { results: formattedResults, total_results: totalResults });
    } catch (err) {
      console.error('Search error:', err);
      callback({
        code: 500,
        message: 'Internal Server Error',
        status: 'INTERNAL'
      });
    }
  },

  Autocomplete: async (call, callback) => {
    const { query, limit } = call.request;
    try {
      const songSuggestions = await Song.find(
        { title: { $regex: `^${query}`, $options: 'i' } },
        'title'
      ).limit(limit);

      const albumSuggestions = await Album.find(
        { title: { $regex: `^${query}`, $options: 'i' } },
        'title'
      ).limit(limit);

      const artistSuggestions = await Artist.find(
        { name: { $regex: `^${query}`, $options: 'i' } },
        'name'
      ).limit(limit);

      const suggestions = [
        ...songSuggestions.map(song => song.title),
        ...albumSuggestions.map(album => album.title),
        ...artistSuggestions.map(artist => artist.name)
      ].slice(0, limit);

      callback(null, { suggestions });
    } catch (error) {
      callback(error);
    }
  }
};

module.exports = searchService;