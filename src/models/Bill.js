// src/models/Bill.js
// ─────────────────────────────────────────────────────────────
// Completed-order archive. Mirrors the Order schema structure
// so historical data is self-contained (no joins to Order needed).
//
// ⚠️  TTL INDEX: MongoDB automatically expires and deletes
//     documents 7 days after their `createdAt` timestamp.
//     The index is defined here in the schema so Mongoose
//     syncs it on startup — no manual Atlas/shell command needed.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

// ── Reuse the same item sub-schema shape ──
const billItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'MenuItem',
    },
    quantity:           { type: Number, required: true, min: 1 },
    priceAtTimeOfOrder: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    // ── References — kept for relational queries if needed ──
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Table',
    },
    waiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },

    customerName:  { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },

    items:         { type: [billItemSchema], default: [] },
    totalAmount:   { type: Number, required: true, min: 0 },
    gstApplied:    { type: Number, default: 0, min: 0 },

    // Snapshot of the GST percentage that was active at time of billing
    gstPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── TTL index: auto-delete documents 7 days after creation ──
// 604800 seconds = 60 * 60 * 24 * 7 = 7 days
billSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

// ── Indexes to support analytics aggregation pipelines ──
billSchema.index({ customerName: 1 });
billSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Bill', billSchema);
