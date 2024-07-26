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
    const artistsCollection = db.collection('artists');
    const albumsCollection = db.collection('albums');

    // Clear existing data
    await songsCollection.deleteMany({});
    await artistsCollection.deleteMany({});
    await albumsCollection.deleteMany({});

    const artistsSet = new Set();
    const albumsSet = new Set();

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
        writers: row.Writer.split('\n').map(writer => writer.trim()), // Split and trim writers
        album: row.Album,
        year: parseInt(row.Year),
        plays: [
          { month: 'June', count: parseInt(row['Plays - June']) },
          { month: 'July', count: parseInt(row['Plays - July']) },
          { month: 'August', count: parseInt(row['Plays - August']) }
        ]
      };

      await songsCollection.insertOne(song);

      artistsSet.add(row.Artist);
      albumsSet.add(row.Album);
    }

    // Insert artists
    for (const artist of artistsSet) {
      await artistsCollection.insertOne({ name: artist });
    }

    // Insert albums
    for (const album of albumsSet) {
      await albumsCollection.insertOne({ title: album });
    }

    console.log(`Imported ${results.length} songs`);
    console.log(`Imported ${artistsSet.size} artists`);
    console.log(`Imported ${albumsSet.size} albums`);

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