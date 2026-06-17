// src/routes/billRoutes.js
// ─────────────────────────────────────────────────────────────
//  GET /api/bills/today       — any authenticated user (Waiter)
//  GET /api/bills/history     — Admin only
//  GET /api/bills/analytics   — Admin only
//  GET /api/bills/item-sales  — Admin only
// ─────────────────────────────────────────────────────────────
const express        = require('express');
const router         = express.Router();
const billController = require('../controllers/billController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// ── Public to all authenticated users ───────────────────────
// Must be BEFORE the requireAdmin block
router.get('/today', verifyToken, billController.getTodaysBills);

// ── Admin-only routes ────────────────────────────────────────
router.use(verifyToken, requireAdmin);
router.get('/history',    billController.getBillHistory);
router.get('/analytics',  billController.getAnalytics);
router.get('/item-sales', billController.getItemSales);
router.delete('/:id',     billController.deleteBill);

module.exports = router;
