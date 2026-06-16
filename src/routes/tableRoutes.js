// src/routes/tableRoutes.js
// ─────────────────────────────────────────────────────────────
//  GET    /api/tables        — any authenticated user
//  GET    /api/tables/:id    — any authenticated user
//  POST   /api/tables        — Admin only
//  PUT    /api/tables/:id    — Admin only
//  DELETE /api/tables/:id    — Admin only
// ─────────────────────────────────────────────────────────────
const express           = require('express');
const router            = express.Router();
const tableController   = require('../controllers/tableController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken);

router.get('/',     tableController.getAllTables);
router.get('/:id',  tableController.getTableById);

router.post('/',      requireAdmin, tableController.createTable);
router.put('/:id',    requireAdmin, tableController.updateTable);
router.delete('/:id', requireAdmin, tableController.deleteTable);

module.exports = router;
