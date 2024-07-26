const { Song, Album, Artist } = require('./db');

const searchService = {
  Search: async (call, callback) => {
    const { query, limit, offset } = call.request;
    try {
      const songResults = await Song.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).skip(offset).limit(limit);

      const albumResults = await Album.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).skip(offset).limit(limit);

      const artistResults = await Artist.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } }).skip(offset).limit(limit);

      const results = [
        ...songResults.map(song => ({
          id: song._id,
          type: 'song',
          title: song.title,
          artist: song.artist,
          relevance_score: song.score
        })),
        ...albumResults.map(album => ({
          id: album._id,
          type: 'album',
          title: album.title,
          artist: album.artist,
          relevance_score: album.score
        })),
        ...artistResults.map(artist => ({
          id: artist._id,
          type: 'artist',
          title: artist.name,
          relevance_score: artist.score
        }))
      ].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, limit);

      const total_results = await Song.countDocuments({ $text: { $search: query } }) +
                            await Album.countDocuments({ $text: { $search: query } }) +
                            await Artist.countDocuments({ $text: { $search: query } });

      callback(null, { results, total_results });
    } catch (error) {
      callback(error);
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
    const { query, filters, sort, limit, offset } = call.request;
    try {
      let searchQuery = { $text: { $search: query } };
      filters.forEach(filter => {
        searchQuery[filter.field] = filter.value;
      });

      const results = await Song.find(
        searchQuery,
        { score: { $meta: "textScore" } }
      ).sort({ [sort.field]: sort.order, score: { $meta: "textScore" } }).skip(offset).limit(limit);

      const searchResults = results.map(result => ({
        id: result._id,
        type: 'song',
        title: result.title,
        artist: result.artist,
        relevance_score: result.score
      }));

      const total_results = await Song.countDocuments(searchQuery);

      callback(null, { results: searchResults, total_results });
    } catch (error) {
      callback(error);
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