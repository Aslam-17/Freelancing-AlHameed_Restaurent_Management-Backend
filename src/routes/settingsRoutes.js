// src/routes/settingsRoutes.js
// ─────────────────────────────────────────────────────────────
//  GET /api/settings       — any authenticated user (reads current GST)
//  PUT /api/settings/gst   — Admin only
// ─────────────────────────────────────────────────────────────
const express              = require('express');
const router               = express.Router();
const settingsController   = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken);

router.get('/',    settingsController.getSettings);
router.put('/gst', requireAdmin, settingsController.updateGst);

module.exports = router;
