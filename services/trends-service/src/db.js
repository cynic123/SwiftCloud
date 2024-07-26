const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  album: String,
  year: Number,
  genre: String,
  plays: [{
    date: Date,
    count: Number,
    listeners: [String]
  }]
});

const albumSchema = new mongoose.Schema({
  title: String,
  artist: String,
  year: Number,
  genre: String,
  plays: [{
    date: Date,
    count: Number,
    listeners: [String]
  }]
});

const artistSchema = new mongoose.Schema({
  name: String,
  genre: String,
  popularity: Number,
  plays: [{
    date: Date,
    count: Number,
    listeners: [String]
  }]
});

const Song = mongoose.model('Song', songSchema);
const Album = mongoose.model('Album', albumSchema);
const Artist = mongoose.model('Artist', artistSchema);

const connectDB = async () => {
  await mongoose.connect('mongodb://localhost:27017/swiftcloud');
  console.log('Connected to MongoDB');
};

module.exports = { Song, Album, Artist, connectDB };