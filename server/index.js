require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { sanitizeMiddleware, aiRateLimit } = require('./middleware/sanitize');

const projectRoutes = require('./routes/projects');
const schemaRoutes = require('./routes/schemas');
const generateRoutes = require('./routes/generate');
const endpointRoutes = require('./routes/endpoints');
const architectureRoutes = require('./routes/architecture');
const settingsRoutes = require('./routes/settings');
const sandboxRoutes = require('./routes/sandbox');

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeMiddleware);

// Core routes
app.use('/api/projects', projectRoutes);
app.use('/api/schemas', schemaRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sandbox', sandboxRoutes);

// AI-powered routes (rate limited)
app.use('/api/endpoints', aiRateLimit(20, 60000), endpointRoutes);
app.use('/api/architecture', aiRateLimit(10, 60000), architectureRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
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
