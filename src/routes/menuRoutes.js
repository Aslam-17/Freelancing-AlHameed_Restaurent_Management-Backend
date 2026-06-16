// src/routes/menuRoutes.js
// ─────────────────────────────────────────────────────────────
//  GET    /api/menu        — any authenticated user
//  GET    /api/menu/:id    — any authenticated user
//  POST   /api/menu        — Admin only
//  PUT    /api/menu/:id    — Admin only
//  DELETE /api/menu/:id    — Admin only
// ─────────────────────────────────────────────────────────────
const express          = require('express');
const router           = express.Router();
const menuController   = require('../controllers/menuController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All menu routes require authentication
router.use(verifyToken);

router.get('/',    menuController.getAllMenuItems);
router.get('/:id', menuController.getMenuItemById);

// Write operations are Admin-only
router.post('/',    requireAdmin, menuController.createMenuItem);
router.put('/:id',  requireAdmin, menuController.updateMenuItem);
router.delete('/:id', requireAdmin, menuController.deleteMenuItem);

module.exports = router;
