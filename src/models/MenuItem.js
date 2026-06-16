// src/models/MenuItem.js
// ─────────────────────────────────────────────────────────────
// Represents a single item on the restaurant menu.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Menu item name is required'],
      trim:     true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    price: {
      type:    Number,
      required: [true, 'Price is required'],
      min:     [0, 'Price cannot be negative'],
    },

    category: {
      type:     String,
      required: [true, 'Category is required'],
      trim:     true,
    },

    isAvailable: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ── Text index for fast search by name / category ──
menuItemSchema.index({ name: 'text', category: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);
