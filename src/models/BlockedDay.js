const mongoose = require('mongoose');

// Un día completo (hora de la clínica) marcado como no laborable — no se puede
// agendar ninguna cita nueva ese día, ni por el chat de campaña ni desde la
// Agenda del dashboard. Ver src/services/blockedDay.service.js.
const blockedDaySchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD, hora de la clínica
      required: true,
      unique: true,
      trim: true,
    },

    reason: {
      type: String,
      trim: true,
      default: '',
    },

    blockedBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      name: String,
      email: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BlockedDay', blockedDaySchema);
