// src/server.js
// ─────────────────────────────────────────────────────────────
// Application entry point.
// Sets up Express, registers all middleware and routes,
// then starts the HTTP listener.
// ─────────────────────────────────────────────────────────────
require('dotenv').config(); // Load .env FIRST — before any other import reads env vars

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const connectDB  = require('./config/db');

// ── Route modules ──
const authRoutes     = require('./routes/authRoutes');
const menuRoutes     = require('./routes/menuRoutes');
const tableRoutes    = require('./routes/tableRoutes');
const orderRoutes    = require('./routes/orderRoutes');
const billRoutes     = require('./routes/billRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes     = require('./routes/userRoutes');

// ── Error-handling middleware (must be imported last) ──
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ─────────────────────────────────────────────────────────────
// 1. Connect to MongoDB
// ─────────────────────────────────────────────────────────────
connectDB();

// ─────────────────────────────────────────────────────────────
// 2. Initialise Express app
// ─────────────────────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────────────────────
// 3. Security & utility middleware
// ─────────────────────────────────────────────────────────────

// Helmet: sets security-related HTTP response headers
app.use(helmet());

// CORS: allow only origins listed in ALLOWED_ORIGINS env var
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed.`));
      }
    },
    methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Parse incoming JSON bodies (max 10 kb — prevents large-payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// HTTP request logger (skip in test environments)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─────────────────────────────────────────────────────────────
// 4. Health-check route (no auth required)
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Rasool Restaurant API is running.',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// 5. API routes
// ─────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/menu',     menuRoutes);
app.use('/api/tables',   tableRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/bills',    billRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users',    userRoutes);

// ─────────────────────────────────────────────────────────────
// 6. Error-handling middleware (must come AFTER all routes)
// ─────────────────────────────────────────────────────────────
app.use(notFound);      // 404 for any unmatched route
app.use(errorHandler);  // Global error formatter

// ─────────────────────────────────────────────────────────────
// 7. Start the server
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀  Server running in [${process.env.NODE_ENV}] mode on port ${PORT}`);
  console.log(`📡  Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app; // export for potential testing
