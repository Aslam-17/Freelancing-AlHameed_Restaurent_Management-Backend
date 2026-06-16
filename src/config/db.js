// src/config/db.js
// ─────────────────────────────────────────────────────────────
// MongoDB connection using Mongoose.
// Called once at server startup; logs connection status.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI from the environment.
 * Exits the process if the initial connection fails so the
 * server never starts in a broken state.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options suppress deprecation warnings in Mongoose 7+
    });
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection failed: ${error.message}`);
    process.exit(1); // Non-zero exit signals an error to the host process
  }
};

module.exports = connectDB;
