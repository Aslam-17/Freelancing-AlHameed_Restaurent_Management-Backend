// src/models/SystemSettings.js
// ─────────────────────────────────────────────────────────────
// Single-document collection for dynamic system configuration.
// Use SystemSettings.getSingleton() to always get the one record.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    // Enforce a single document by pinning the _id to a constant
    _id: {
      type:    String,
      default: 'global_settings',
    },

    currentGstPercentage: {
      type:    Number,
      default: 5,
      min:     [0,  'GST percentage cannot be negative'],
      max:     [100,'GST percentage cannot exceed 100'],
    },
  },
  {
    timestamps:  true,
    // Disable auto _id generation (we supply our own constant above)
    _id:         false,
    versionKey:  false,
  }
);

// ── Static helper: fetch (or create) the singleton settings doc ──
systemSettingsSchema.statics.getSingleton = async function () {
  let settings = await this.findById('global_settings');
  if (!settings) {
    settings = await this.create({ _id: 'global_settings' });
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
