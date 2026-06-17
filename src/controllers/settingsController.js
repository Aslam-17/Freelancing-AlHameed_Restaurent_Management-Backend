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
    const { gstPercentage, acChargePerPerson } = req.body;
    const updates = {};

    if (gstPercentage !== undefined) {
      if (typeof gstPercentage !== 'number') return res.status(400).json({ success: false, message: 'gstPercentage must be a number.' });
      updates.currentGstPercentage = gstPercentage;
    }

    if (acChargePerPerson !== undefined) {
      if (typeof acChargePerPerson !== 'number') return res.status(400).json({ success: false, message: 'acChargePerPerson must be a number.' });
      updates.acChargePerPerson = acChargePerPerson;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one setting to update.' });
    }

    const settings = await SystemSettings.findByIdAndUpdate(
      'global_settings',
      updates,
      { new: true, runValidators: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      data:    settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateGst };
