// src/controllers/authController.js
// ─────────────────────────────────────────────────────────────
// Handles user authentication and account management.
//
//  login          POST /api/auth/login
//  register       POST /api/auth/register       (Admin only)
//  resetPassword  PUT  /api/auth/reset-password (Admin only)
// ─────────────────────────────────────────────────────────────
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Helper: sign a JWT for a given user document ──
const signToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { username, password }
// ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    // Explicitly select password because it has `select: false` in the schema
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

    if (!user) {
      // Generic message — do not reveal whether the username exists
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = signToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id:       user._id,
        username: user.username,
        role:     user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register  (Admin only)
// Body: { username, password, role? }
// Creates a new Waiter account (Admins cannot be created via API).
// ─────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    // Safety: only allow Waiter creation through this endpoint.
    // Admin accounts must be seeded directly in the database.
    const assignedRole = role === 'Admin' ? 'Waiter' : (role || 'Waiter');

    const user = await User.create({ username, password, role: assignedRole });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: {
        id:       user._id,
        username: user.username,
        role:     user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/reset-password  (Admin only)
// Body: { username, newPassword }
// ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username and newPassword are required.',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Assign new password — the pre-save hook will hash it automatically
    user.password  = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, resetPassword };
