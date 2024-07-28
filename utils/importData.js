const fs = require('fs');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');
const path = require('path');

const uri = "mongodb://localhost:27017";
const dbName = "swiftcloud";

const csvFilePath = path.join(__dirname, 'SwiftCloud-Sheet1.csv');

async function importData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const songsCollection = db.collection('songs');
    const albumsCollection = db.collection('albums');
    const artistsCollection = db.collection('artists');

    // Clear existing data
    await songsCollection.deleteMany({});
    await albumsCollection.deleteMany({});
    await artistsCollection.deleteMany({});

    const albumsMap = new Map();
    const artistsMap = new Map();

    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const row of results) {
      const song = {
        title: row.Song,
        artist: row.Artist,
        writers: row.Writer ? row.Writer.split('\n').map(writer => writer.trim()) : [], // Split and trim writers
        album: row.Album,
        year: parseInt(row.Year) || null,
        plays: [
          { month: 'June', count: parseInt(row['Plays - June']) || 0 },
          { month: 'July', count: parseInt(row['Plays - July']) || 0 },
          { month: 'August', count: parseInt(row['Plays - August']) || 0 }
        ]
      };

      await songsCollection.insertOne(song);

      if (!albumsMap.has(row.Album)) {
        albumsMap.set(row.Album, {
          name: row.Album,
          artist: row.Artist,
          writers: new Set(song.writers),
          plays: [...song.plays]
        });
      } else {
        const album = albumsMap.get(row.Album);
        album.writers = new Set([...album.writers, ...song.writers]);
        album.plays = album.plays.map((play, index) => ({
          month: play.month,
          count: play.count + song.plays[index].count
        }));
        albumsMap.set(row.Album, album);
      }

      if (!artistsMap.has(row.Artist)) {
        artistsMap.set(row.Artist, {
          name: row.Artist,
          plays: [...song.plays]
        });
      } else {
        const artist = artistsMap.get(row.Artist);
        artist.plays = artist.plays.map((play, index) => ({
          month: play.month,
          count: play.count + song.plays[index].count
        }));
        artistsMap.set(row.Artist, artist);
      }
    }

    // Insert albums
    for (const [albumName, albumData] of albumsMap.entries()) {
      albumData.writers = Array.from(albumData.writers); // Convert writers set to array
      await albumsCollection.insertOne(albumData);
    }

    // Insert artists
    for (const [artistName, artistData] of artistsMap.entries()) {
      await artistsCollection.insertOne(artistData);
    }

    console.log(`Imported ${results.length} songs`);
    console.log(`Imported ${albumsMap.size} albums`);
    console.log(`Imported ${artistsMap.size} artists`);

    console.log("Data import completed");
  } catch (err) {
    console.error("Error importing data:", err);
    throw err;
  } finally {
    await client.close();
  }
}

// Run the import function if this script is run directly
if (require.main === module) {
  importData().catch(console.error);
}

module.exports = importData;