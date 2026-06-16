// src/controllers/settingsController.js
// ─────────────────────────────────────────────────────────────
// Manages the singleton SystemSettings document.
//
//  getSettings  GET /api/settings
//  updateGst    PUT /api/settings/gst
// ─────────────────────────────────────────────────────────────
const SystemSettings = require('../models/SystemSettings');

// ── GET /api/settings ──────────────────────────────────────────
const getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSingleton();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/settings/gst ──────────────────────────────────────
// Body: { gstPercentage: 18 }
const updateGst = async (req, res, next) => {
  try {
    const { gstPercentage } = req.body;

    if (gstPercentage === undefined || typeof gstPercentage !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'gstPercentage (number) is required.',
      });
    }

    const settings = await SystemSettings.findByIdAndUpdate(
      'global_settings',
      { currentGstPercentage: gstPercentage },
      { new: true, runValidators: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: `GST updated to ${gstPercentage}%.`,
      data:    settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateGst };
