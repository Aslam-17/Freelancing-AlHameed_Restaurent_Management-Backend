// src/models/Table.js
// ─────────────────────────────────────────────────────────────
// Represents a physical dining table on the restaurant floor.
// blueprintData stores UI positioning for the floor-plan widget.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type:     Number,
      required: [true, 'Table number is required'],
      unique:   true,
      min:      [1, 'Table number must be at least 1'],
    },

    name: {
      type:  String,
      trim:  true,
      // e.g. "Window Seat", "Corner Booth" — optional friendly label
    },

    capacity: {
      type:     Number,
      required: [true, 'Capacity is required'],
      enum:     {
        values:  [3, 4, 5, 6, 8],
        message: 'Capacity must be one of 3, 4, 5, 6, or 8',
      },
    },

    zone: {
      type:     String,
      required: [true, 'Zone is required'],
      enum:     {
        values:  ['AC', 'Non-AC'],
        message: 'Zone must be either AC or Non-AC',
      },
    },

    // ── Floor-plan / SVG layout data ──
    blueprintData: {
      x: {
        type:    Number,
        default: 0,
      },
      y: {
        type:    Number,
        default: 0,
      },
      svgType: {
        type:    String,
        default: 'rect', // 'rect' | 'circle' | custom SVG identifier
        trim:    true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);
