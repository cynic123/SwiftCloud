const express = require('express');
const songRoutes = require('./routes/songRoutes');
const popularityRoutes = require('./routes/popularityRoutes');
const trendRoutes = require('./routes/trendRoutes');
const searchRoutes = require('./routes/searchRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/songs', songRoutes);
app.use('/api/popularity', popularityRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/search', searchRoutes);

app.listen(port, () => {
  console.log(`Swift API running on port ${port}`);
});