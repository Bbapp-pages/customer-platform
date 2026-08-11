const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['whatsapp_send', 'email_send', 'campaign_followup', 'gemini', 'webhook', 'auth'],
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemLog', systemLogSchema);
