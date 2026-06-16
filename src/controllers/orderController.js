// src/controllers/orderController.js
// ─────────────────────────────────────────────────────────────
// Handles the active floor-order lifecycle.
//
//  createOrder    POST /api/orders
//  getActiveOrders GET  /api/orders/active
//  completeOrder  POST /api/orders/:id/complete
// ─────────────────────────────────────────────────────────────
const Order          = require('../models/Order');
const Bill           = require('../models/Bill');
const MenuItem       = require('../models/MenuItem');
const SystemSettings = require('../models/SystemSettings');

// ─────────────────────────────────────────────────────────────
// POST /api/orders
// Body: { tableId, customerName, customerPhone?, items: [{ menuItemId, quantity }] }
// The waiter creates an order; prices are fetched from the DB (not trusted from client).
// ─────────────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { tableId, customerName, customerPhone, items, orderId } = req.body;

    if (!tableId || !customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tableId, customerName, and at least one item are required.',
      });
    }

    // ── Resolve prices from the DB — never trust client-submitted prices ──
    const resolvedItems = [];
    let   subTotal      = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item not found: ${item.menuItemId}`,
        });
      }
      if (!menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `'${menuItem.name}' is currently unavailable.`,
        });
      }

      resolvedItems.push({
        menuItem:           menuItem._id,
        quantity:           item.quantity,
        priceAtTimeOfOrder: menuItem.price,
      });
      subTotal += menuItem.price * item.quantity;
    }

    // ── If orderId is provided, perform an explicit edit/overwrite update ──
    if (orderId) {
      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          message: 'Active order not found. It may have been completed or cancelled.',
        });
      }

      existingOrder.items = resolvedItems;
      existingOrder.totalAmount = subTotal;
      await existingOrder.save();

      return res.status(200).json({
        success: true,
        message: 'Order updated successfully.',
        data:    existingOrder,
      });
    }

    // ── Check if an active order already exists for this table and customer ──
    const activeOrdersForTable = await Order.find({ tableId });
    const existingOrder = activeOrdersForTable.find(
      (o) => o.customerName.trim().toLowerCase() === customerName.trim().toLowerCase()
    );

    if (existingOrder) {
      // Append or update items
      for (const newItem of resolvedItems) {
        const existingItemIdx = existingOrder.items.findIndex(
          (item) => item.menuItem.toString() === newItem.menuItem.toString()
        );

        if (existingItemIdx > -1) {
          // Increment quantity and update price snapshot
          existingOrder.items[existingItemIdx].quantity += newItem.quantity;
          existingOrder.items[existingItemIdx].priceAtTimeOfOrder = newItem.priceAtTimeOfOrder;
        } else {
          // Push new item
          existingOrder.items.push(newItem);
        }
      }

      // Recalculate total amount from all items
      existingOrder.totalAmount = existingOrder.items.reduce(
        (acc, item) => acc + item.priceAtTimeOfOrder * item.quantity,
        0
      );

      // Save updated order
      await existingOrder.save();

      return res.status(200).json({
        success: true,
        message: 'Items added to the existing order.',
        data:    existingOrder,
      });
    }

    // Otherwise, create a new order
    const order = await Order.create({
      tableId,
      waiterId:     req.user.id, // from the verified JWT
      customerName,
      customerPhone,
      items:        resolvedItems,
      totalAmount:  subTotal,   // GST added at bill-completion time
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data:    order,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/orders/active
// Returns all active orders (populated with table & waiter info).
// Accessible by both Admin and Waiter.
// ─────────────────────────────────────────────────────────────
const getActiveOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('tableId',  'tableNumber name zone')
      .populate('waiterId', 'username')
      .populate('items.menuItem', 'name price category')
      .sort({ createdAt: -1 }); // newest first (for the live column widget)

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/orders/:id/complete
// ──────────────────────────────────────────────────────────────
// 1. Fetches the active order.
// 2. Reads the current GST % from SystemSettings.
// 3. Calculates final total (subtotal + GST).
// 4. Inserts a new Bill document (archive).
// 5. Deletes the order from the active Orders collection.
// ─────────────────────────────────────────────────────────────
const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Active order not found.' });
    }

    // ── Fetch live GST setting ──
    const settings      = await SystemSettings.getSingleton();
    const gstPercentage = settings.currentGstPercentage;

    // ── Recalculate subtotal from stored item snapshots ──
    const subTotal  = order.items.reduce(
      (acc, item) => acc + item.priceAtTimeOfOrder * item.quantity,
      0
    );
    const gstAmount = parseFloat(((subTotal * gstPercentage) / 100).toFixed(2));
    const total     = parseFloat((subTotal + gstAmount).toFixed(2));

    // ── Archive to Bills collection ──
    const bill = await Bill.create({
      tableId:       order.tableId,
      waiterId:      order.waiterId,
      customerName:  order.customerName,
      customerPhone: order.customerPhone,
      items:         order.items,
      totalAmount:   total,
      gstApplied:    gstAmount,
      gstPercentage,
    });

    // ── Remove from active orders ──
    await Order.findByIdAndDelete(order._id);

    res.status(200).json({
      success: true,
      message: 'Order completed and billed successfully.',
      data:    bill,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, getActiveOrders, completeOrder };
