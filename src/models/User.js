// src/models/User.js
// ─────────────────────────────────────────────────────────────
// User schema — stores restaurant staff accounts.
// Passwords are stored as bcrypt hashes (never plain-text).
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type:      String,
      required:  [true, 'Username is required'],
      unique:    true,
      trim:      true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },

    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      // Never return the hash in query results by default
      select:   false,
    },

    role: {
      type:    String,
      enum:    {
        values:  ['Admin', 'Waiter', 'Biller'],
        message: 'Role must be Admin, Waiter, or Biller',
      },
      default: 'Waiter',
    },
  },
  { timestamps: true }
);

// ── Pre-save hook: hash password only when it is new / modified ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt    = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance method: compare plain-text password against stored hash ──
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
