// src/routes/authRoutes.js
// ─────────────────────────────────────────────────────────────
//  POST /api/auth/login            — public
//  POST /api/auth/register         — Admin only
//  PUT  /api/auth/reset-password   — Admin only
// ─────────────────────────────────────────────────────────────
const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Public
router.post('/login', authController.login);

// Admin-protected
router.post('/register',       verifyToken, requireAdmin, authController.register);
router.put('/reset-password',  verifyToken, requireAdmin, authController.resetPassword);

module.exports = router;
