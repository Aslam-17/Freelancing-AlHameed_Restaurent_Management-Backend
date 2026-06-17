// src/controllers/billController.js
// ─────────────────────────────────────────────────────────────
// Analytics and history for the completed-bill archive.
//
//  getBillHistory  GET /api/bills/history     (admin)
//  getAnalytics    GET /api/bills/analytics   (admin)
//  getTodaysBills  GET /api/bills/today       (any authenticated user)
//  getItemSales    GET /api/bills/item-sales  (admin)
// ─────────────────────────────────────────────────────────────
const Bill = require('../models/Bill');

// ─────────────────────────────────────────────────────────────
// GET /api/bills/history
// Optional query: ?customerName=Ahmed
// Returns bills sorted newest-first (last 7 days due to TTL).
// ─────────────────────────────────────────────────────────────
const getBillHistory = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.customerName) {
      filter.customerName = new RegExp(req.query.customerName.trim(), 'i');
    }

    const bills = await Bill.find(filter)
      .populate('tableId',  'tableNumber name zone')
      .populate('waiterId', 'username')
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/bills/analytics
// Returns total revenue and bill count for:
//   today | this week (Mon–Sun) | this month | this year
// ─────────────────────────────────────────────────────────────
const getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();

    const startOfDay  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek   = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - dayOfWeek);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);

    const [result] = await Bill.aggregate([
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: startOfDay } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, billCount: { $sum: 1 } } },
          ],
          thisWeek: [
            { $match: { createdAt: { $gte: startOfWeek } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, billCount: { $sum: 1 } } },
          ],
          thisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, billCount: { $sum: 1 } } },
          ],
          thisYear: [
            { $match: { createdAt: { $gte: startOfYear } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, billCount: { $sum: 1 } } },
          ],
          dailyBreakdown: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            {
              $group: {
                _id:          { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                totalRevenue: { $sum: '$totalAmount' },
                billCount:    { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const normalise = (facet) =>
      facet.length > 0
        ? { totalRevenue: facet[0].totalRevenue, billCount: facet[0].billCount }
        : { totalRevenue: 0, billCount: 0 };

    res.status(200).json({
      success: true,
      data: {
        today:          normalise(result.today),
        thisWeek:       normalise(result.thisWeek),
        thisMonth:      normalise(result.thisMonth),
        thisYear:       normalise(result.thisYear),
        dailyBreakdown: result.dailyBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/bills/today
// Accessible to any authenticated user (Waiter & Admin).
// Returns all bills created today, newest first.
// Optional query: ?search=<text>  (matches customerName)
// ─────────────────────────────────────────────────────────────
const getTodaysBills = async (req, res, next) => {
  try {
    const now        = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filter = { createdAt: { $gte: startOfDay } };

    if (req.query.search) {
      filter.customerName = new RegExp(req.query.search.trim(), 'i');
    }

    const bills = await Bill.find(filter)
      .populate('tableId',        'tableNumber name zone')
      .populate('waiterId',       'username')
      .populate('items.menuItem', 'name category price')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/bills/item-sales?period=today|month|year
// Admin-only. Returns per-menu-item sold quantity + revenue
// for the requested period, sorted by quantity descending.
// ─────────────────────────────────────────────────────────────
const getItemSales = async (req, res, next) => {
  try {
    const now    = new Date();
    const period = req.query.period || 'today';

    let startDate;
    if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const result = await Bill.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id:      '$items.menuItem',
          totalQty: { $sum: '$items.quantity' },
          totalRev: { $sum: { $multiply: ['$items.quantity', '$items.priceAtTimeOfOrder'] } },
        },
      },
      {
        $lookup: {
          from:         'menuitems',
          localField:   '_id',
          foreignField: '_id',
          as:           'menuItemData',
        },
      },
      { $unwind: '$menuItemData' },
      {
        $project: {
          _id:      0,
          itemId:   '$_id',
          name:     '$menuItemData.name',
          category: '$menuItemData.category',
          price:    '$menuItemData.price',
          totalQty: 1,
          totalRev: 1,
        },
      },
      { $sort: { totalQty: -1 } },
    ]);

    res.status(200).json({ success: true, period, data: result });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/bills/:id
// Admin-only. Deletes a specific bill from history.
// ─────────────────────────────────────────────────────────────
const deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }
    res.status(200).json({ success: true, message: 'Bill deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBillHistory, getAnalytics, getTodaysBills, getItemSales, deleteBill };
