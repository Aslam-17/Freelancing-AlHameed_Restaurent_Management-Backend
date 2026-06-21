// src/controllers/orderController.js
// ─────────────────────────────────────────────────────────────
// Handles the active floor-order lifecycle.
//
//  createOrder    POST /api/orders
//  getActiveOrders GET  /api/orders/active
//  completeOrder  POST /api/orders/:id/complete
//  deleteOrder    DELETE /api/orders/:id
// ─────────────────────────────────────────────────────────────
const Order          = require('../models/Order');
const Bill           = require('../models/Bill');
const MenuItem       = require('../models/MenuItem');
const SystemSettings = require('../models/SystemSettings');

// ─────────────────────────────────────────────────────────────
// POST /api/orders
// Body: { orderType?, tableId?, customerName, customerPhone?,
//         numberOfPeople?, items: [{ menuItemId, quantity }], orderId? }
//
// For Dine-in: tableId is required, acCharge is calculated.
// For Takeaway: tableId is omitted, acCharge is always 0.
// ─────────────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const {
      orderType = 'Dine-in',
      tableId,
      customerName,
      customerPhone,
      items,
      orderId,
      numberOfPeople,
    } = req.body;

    // ── Basic validation ──────────────────────────────────────
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'customerName and at least one item are required.',
      });
    }

    // Dine-in requires a table
    if (orderType !== 'Takeaway' && !tableId) {
      return res.status(400).json({
        success: false,
        message: 'tableId is required for Dine-in orders.',
      });
    }

    // ── Table lookup & AC charge (Dine-in only) ───────────────
    let table    = null;
    let acCharge = 0;

    if (orderType !== 'Takeaway' && tableId) {
      const Table = require('../models/Table');
      table = await Table.findById(tableId);
      if (!table) {
        return res.status(404).json({ success: false, message: 'Table not found.' });
      }
      const settings = await SystemSettings.getSingleton();
      const people   = numberOfPeople || 1;
      acCharge = table.zone === 'AC' ? (settings.acChargePerPerson * people) : 0;
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

      existingOrder.items         = resolvedItems;
      existingOrder.numberOfPeople = numberOfPeople || existingOrder.numberOfPeople;
      existingOrder.acCharge      = acCharge;
      existingOrder.totalAmount   = subTotal + acCharge;
      await existingOrder.save();

      return res.status(200).json({
        success: true,
        message: 'Order updated successfully.',
        data:    existingOrder,
      });
    }

    // ── Check if an active order already exists for this table and customer ──
    if (orderType !== 'Takeaway' && tableId) {
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
            existingOrder.items[existingItemIdx].quantity += newItem.quantity;
            existingOrder.items[existingItemIdx].priceAtTimeOfOrder = newItem.priceAtTimeOfOrder;
          } else {
            existingOrder.items.push(newItem);
          }
        }

        const existingSubTotal = existingOrder.items.reduce(
          (acc, item) => acc + item.priceAtTimeOfOrder * item.quantity,
          0
        );
        existingOrder.numberOfPeople = numberOfPeople || existingOrder.numberOfPeople;
        existingOrder.acCharge       = acCharge;
        existingOrder.totalAmount    = existingSubTotal + acCharge;

        await existingOrder.save();

        return res.status(200).json({
          success: true,
          message: 'Items added to the existing order.',
          data:    existingOrder,
        });
      }
    }

    // ── Create a new order ────────────────────────────────────
    const order = await Order.create({
      orderType,
      tableId:        tableId || undefined,
      waiterId:       req.user.id,
      customerName,
      customerPhone,
      numberOfPeople: numberOfPeople || 1,
      acCharge,
      items:          resolvedItems,
      totalAmount:    subTotal + acCharge,
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
// Accessible by all authenticated users.
// ─────────────────────────────────────────────────────────────
const getActiveOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('tableId',  'tableNumber name zone')
      .populate('waiterId', 'username')
      .populate('items.menuItem', 'name price category')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/orders/:id/complete
// 1. Fetches the active order.
// 2. Reads the current GST % from SystemSettings.
// 3. Calculates final total (subtotal + GST).
// 4. Inserts a new Bill document (archive) with orderType.
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
    const subTotal   = order.items.reduce(
      (acc, item) => acc + item.priceAtTimeOfOrder * item.quantity,
      0
    );
    const baseAmount = subTotal + (order.acCharge || 0);
    const gstAmount  = parseFloat(((baseAmount * gstPercentage) / 100).toFixed(2));
    const total      = parseFloat((baseAmount + gstAmount).toFixed(2));

    // ── Archive to Bills collection (carry orderType forward) ──
    const bill = await Bill.create({
      orderType:      order.orderType || 'Dine-in',
      tableId:        order.tableId,
      waiterId:       order.waiterId,
      customerName:   order.customerName,
      customerPhone:  order.customerPhone,
      numberOfPeople: order.numberOfPeople,
      acCharge:       order.acCharge || 0,
      items:          order.items,
      totalAmount:    total,
      gstApplied:     gstAmount,
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

// ─────────────────────────────────────────────────────────────
// DELETE /api/orders/:id
// Cancel and delete an active order.
// ─────────────────────────────────────────────────────────────
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Active order not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled and deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, getActiveOrders, completeOrder, deleteOrder };
