const mongoose = require('mongoose');

const customInstructionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdBy: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, name: String, email: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomInstruction', customInstructionSchema);
