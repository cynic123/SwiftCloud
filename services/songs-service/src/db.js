const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  writers: [String],
  album: String,
  year: Number,
  plays: [{
    month: String,
    count: Number
  }]
});

const Song = mongoose.model('Song', songSchema);

const connectDB = async () => {
  await mongoose.connect('mongodb://localhost:27017/swiftcloud');
  console.log('Connected to MongoDB');
};

module.exports = { Song, connectDB };