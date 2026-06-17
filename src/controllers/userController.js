// src/controllers/userController.js
// ─────────────────────────────────────────────────────────────
// Admin-only waiter account management.
// ─────────────────────────────────────────────────────────────
const User = require('../models/User');

// GET /api/users — list all Waiter accounts
const listWaiters = async (req, res, next) => {
  try {
    const waiters = await User.find().select('-password').sort('role username');
    res.json({ success: true, data: waiters });
  } catch (err) { next(err); }
};

// POST /api/users — create a new Waiter account
const createWaiter = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password are required.' });

    const userRole = role === 'Admin' ? 'Admin' : 'Waiter';

    const user = await User.create({ username: username.toLowerCase().trim(), password, role: userRole });
    res.status(201).json({
      success: true,
      message: 'User created.',
      data: { _id: user._id, username: user.username, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Username already taken.' });
    next(err);
  }
};

// PUT /api/users/:id — update username
const updateWaiter = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username)
      return res.status(400).json({ success: false, message: 'Username is required.' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username: username.toLowerCase().trim() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Username already taken.' });
    next(err);
  }
};

// PUT /api/users/:id/password — reset password
const resetWaiterPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.password = password;
    await user.save(); // triggers bcrypt pre-save hook
    res.json({ success: true, message: 'Password updated.' });
  } catch (err) { next(err); }
};

const deleteWaiter = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) { next(err); }
};

module.exports = { listWaiters, createWaiter, updateWaiter, resetWaiterPassword, deleteWaiter };
