// src/routes/userRoutes.js
// ─────────────────────────────────────────────────────────────
//  GET    /api/users          — Admin only (list all waiters)
//  POST   /api/users          — Admin only (create waiter)
//  PUT    /api/users/:id      — Admin only (update username)
//  PUT    /api/users/:id/password — Admin only (reset password)
//  DELETE /api/users/:id      — Admin only (delete waiter)
// ─────────────────────────────────────────────────────────────
const express        = require('express');
const router         = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken, requireAdmin);

router.get('/',                   userController.listWaiters);
router.post('/',                  userController.createWaiter);
router.put('/:id',                userController.updateWaiter);
router.put('/:id/password',       userController.resetWaiterPassword);
router.delete('/:id',             userController.deleteWaiter);

module.exports = router;
