// src/models/Order.js
// ─────────────────────────────────────────────────────────────
// Active floor orders — documents live here while the table is
// still dining. On bill completion they are MOVED to the Bill
// collection and deleted from here.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

// ── Reusable sub-schema for a single line-item in the order ──
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'MenuItem',
      required: [true, 'Menu item reference is required'],
    },
    quantity: {
      type:     Number,
      required: [true, 'Quantity is required'],
      min:      [1, 'Quantity must be at least 1'],
    },
    // Snapshot of the price at the moment the order was placed.
    // Avoids drift if the menu price changes later.
    priceAtTimeOfOrder: {
      type:     Number,
      required: [true, 'Price snapshot is required'],
      min:      [0, 'Price cannot be negative'],
    },
  },
  { _id: false } // sub-documents don't need their own _id
);

const orderSchema = new mongoose.Schema(
  {
    tableId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Table',
      required: [true, 'Table reference is required'],
    },

    waiterId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Waiter reference is required'],
    },

    customerName: {
      type:     String,
      required: [true, 'Customer name is required'],
      trim:     true,
    },

    customerPhone: {
      type:  String,
      trim:  true,
      match: [/^[0-9+\-\s()]{7,15}$/, 'Invalid phone number format'],
      // Optional — no `required` flag
    },

    numberOfPeople: {
      type:     Number,
      required: [true, 'Number of people is required'],
      min:      [1, 'Must have at least 1 person'],
    },

    acCharge: {
      type:    Number,
      default: 0,
      min:     [0, 'AC charge cannot be negative'],
    },

    items: {
      type:     [orderItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message:   'An order must contain at least one item',
      },
    },

    // Computed and stored on creation / update for quick reads.
    totalAmount: {
      type:    Number,
      default: 0,
      min:     [0, 'Total amount cannot be negative'],
    },

    // GST value stored at the time the order is finalised.
    gstApplied: {
      type:    Number,
      default: 0,
      min:     [0, 'GST cannot be negative'],
    },
  },
  { timestamps: true }
);

// ── Index to quickly fetch all active orders for a specific table ──
orderSchema.index({ tableId: 1 });
orderSchema.index({ waiterId: 1 });

module.exports = mongoose.model('Order', orderSchema);
