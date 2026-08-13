const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['appointment_created', 'appointment_modified', 'day_blocked'],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    actor: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      name: {
        type: String,
      },
      email: {
        type: String,
      },
      role: {
        type: String,
      },
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },

    readBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
