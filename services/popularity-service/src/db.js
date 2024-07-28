const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  album: String,
  plays: [{
    date: Date,
    count: Number
  }]
});

const albumSchema = new mongoose.Schema({
  name: String,
  artist: String,
  plays: [{
    date: Date,
    count: Number
  }]
});

const artistSchema = new mongoose.Schema({
  name: String,
  plays: [{
    date: Date,
    count: Number
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