const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  album: String,
  year: Number,
  duration: Number,
  genre: String
});

const albumSchema = new mongoose.Schema({
  title: String,
  artist: String,
  year: Number,
  track_count: Number,
  genre: String
});

const artistSchema = new mongoose.Schema({
  name: String,
  genre: String,
  song_count: Number,
  album_count: Number
});

// Create text indexes for search
songSchema.index({ title: 'text', artist: 'text', album: 'text' });
albumSchema.index({ title: 'text', artist: 'text' });
artistSchema.index({ name: 'text', genre: 'text' });

const Song = mongoose.model('Song', songSchema);
const Album = mongoose.model('Album', albumSchema);
const Artist = mongoose.model('Artist', artistSchema);

const connectDB = async () => {
  await mongoose.connect('mongodb://localhost:27017/swiftcloud');
  console.log('Connected to MongoDB');
};

module.exports = { Song, Album, Artist, connectDB };