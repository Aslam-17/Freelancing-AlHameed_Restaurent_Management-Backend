// src/routes/orderRoutes.js
// ─────────────────────────────────────────────────────────────
//  POST /api/orders              — any authenticated user (Waiter creates)
//  GET  /api/orders/active       — any authenticated user (Admin live widget)
//  POST /api/orders/:id/complete — any authenticated user (Waiter finalises)
//
// NOTE: The /active route must be defined BEFORE /:id to avoid
//       Express treating "active" as an ObjectId parameter.
// ─────────────────────────────────────────────────────────────
const express           = require('express');
const router            = express.Router();
const orderController   = require('../controllers/orderController');
const { verifyToken }   = require('../middleware/auth');

router.use(verifyToken);

router.get('/active',           orderController.getActiveOrders);
router.post('/',                orderController.createOrder);
router.post('/:id/complete',    orderController.completeOrder);
router.delete('/:id',           verifyToken, orderController.deleteOrder);

module.exports = router;
