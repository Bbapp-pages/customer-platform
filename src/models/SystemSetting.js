const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  { _id: { type: String, default: 'system' }, aiEnabled: { type: Boolean, default: true } },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
