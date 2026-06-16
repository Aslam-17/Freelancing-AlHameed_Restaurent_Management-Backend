// src/utils/seed.js
// ─────────────────────────────────────────────────────────────
// One-time database seeder.
// Run with:  npm run seed
//
// Creates the initial Admin user (if none exists), a default
// Waiter account, and initialises the SystemSettings singleton.
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

const seed = async () => {
  await connectDB();

  // ── Admin user ──────────────────────────────────────────────
  const existingAdmin = await User.findOne({ role: 'Admin' });
  if (!existingAdmin) {
    await User.create({
      username: 'admin',
      password: 'Admin@1234', // hashed by the pre-save hook
      role: 'Admin',
    });
    console.log('✅  Admin user created  (username: admin, password: Admin@1234)');
    console.log('⚠️   CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!');
  } else {
    console.log('ℹ️   Admin user already exists — skipping.');
  }

  // ── Default waiter ──────────────────────────────────────────
  const existingWaiter = await User.findOne({ username: 'waiter1' });
  if (!existingWaiter) {
    await User.create({
      username: 'waiter1',
      password: 'Waiter@1234',
      role: 'Waiter',
    });
    console.log('✅  Default waiter created  (username: waiter1, password: Waiter@1234)');
  } else {
    console.log('ℹ️   Default waiter already exists — skipping.');
  }

  // ── System settings ─────────────────────────────────────────
  await SystemSettings.getSingleton(); // creates it if not present
  console.log('✅  SystemSettings initialised.');

  mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB.');
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
