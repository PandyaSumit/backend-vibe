require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const projectRoutes = require('./routes/projects');
const schemaRoutes = require('./routes/schemas');
const generateRoutes = require('./routes/generate');
const endpointRoutes = require('./routes/endpoints');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/projects', projectRoutes);
app.use('/api/schemas', schemaRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/endpoints', endpointRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`SchemaForge API running on port ${PORT}`);
  });
});
