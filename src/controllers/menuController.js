// src/controllers/menuController.js
// ─────────────────────────────────────────────────────────────
// Full CRUD for the MenuItem collection.
//
//  getAllMenuItems   GET    /api/menu
//  getMenuItemById  GET    /api/menu/:id
//  createMenuItem   POST   /api/menu
//  updateMenuItem   PUT    /api/menu/:id
//  deleteMenuItem   DELETE /api/menu/:id
// ─────────────────────────────────────────────────────────────
const MenuItem = require('../models/MenuItem');

// ── GET /api/menu ──────────────────────────────────────────────
// Optional query params: ?category=Biryani  ?available=true
const getAllMenuItems = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category)  filter.category    = new RegExp(req.query.category, 'i');
    if (req.query.available !== undefined) {
      filter.isAvailable = req.query.available === 'true';
    }

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/menu/:id ──────────────────────────────────────────
const getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/menu ─────────────────────────────────────────────
// Body: { name, price, category, isAvailable? }
const createMenuItem = async (req, res, next) => {
  try {
    const { name, price, category, isAvailable } = req.body;
    const item = await MenuItem.create({ name, price, category, isAvailable });
    res.status(201).json({ success: true, message: 'Menu item created.', data: item });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/menu/:id ──────────────────────────────────────────
// Body: any subset of { name, price, category, isAvailable }
const updateMenuItem = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'price', 'category', 'isAvailable'];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }
    res.status(200).json({ success: true, message: 'Menu item updated.', data: item });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/menu/:id ───────────────────────────────────────
const deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }
    res.status(200).json({ success: true, message: 'Menu item deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
