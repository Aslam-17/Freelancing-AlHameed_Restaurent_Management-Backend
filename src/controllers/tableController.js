// src/controllers/tableController.js
// ─────────────────────────────────────────────────────────────
// Full CRUD for the Table collection.
//
//  getAllTables   GET    /api/tables
//  getTableById  GET    /api/tables/:id
//  createTable   POST   /api/tables
//  updateTable   PUT    /api/tables/:id
//  deleteTable   DELETE /api/tables/:id
// ─────────────────────────────────────────────────────────────
const Table = require('../models/Table');

// ── GET /api/tables ────────────────────────────────────────────
// Optional: ?zone=AC
const getAllTables = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.zone) filter.zone = req.query.zone;

    const tables = await Table.find(filter).sort({ tableNumber: 1 });
    res.status(200).json({ success: true, count: tables.length, data: tables });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/tables/:id ────────────────────────────────────────
const getTableById = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }
    res.status(200).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/tables ───────────────────────────────────────────
// Body: { tableNumber, name?, capacity, zone, blueprintData? }
const createTable = async (req, res, next) => {
  try {
    const { tableNumber, name, capacity, zone, blueprintData } = req.body;
    const table = await Table.create({ tableNumber, name, capacity, zone, blueprintData });
    res.status(201).json({ success: true, message: 'Table created.', data: table });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/tables/:id ────────────────────────────────────────
const updateTable = async (req, res, next) => {
  try {
    const allowedUpdates = ['tableNumber', 'name', 'capacity', 'zone', 'blueprintData'];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const table = await Table.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }
    res.status(200).json({ success: true, message: 'Table updated.', data: table });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/tables/:id ─────────────────────────────────────
const deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }
    res.status(200).json({ success: true, message: 'Table deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
};
