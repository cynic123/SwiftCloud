const express = require('express');
const songsRoutes = require('./routes/songsRoutes');
const popularityRoutes = require('./routes/popularityRoutes');
const trendsRoutes = require('./routes/trendsRoutes');
const searchRoutes = require('./routes/searchRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/songs', songsRoutes);
app.use('/api/popularity', popularityRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/search', searchRoutes);

app.listen(port, () => {
  console.log(`Swift API running on port ${port}`);
});