    const mongoose = require('mongoose');

    const messageSchema = new mongoose.Schema(
    {
        conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
        },

        sender: {
        type: String,
        enum: ['customer', 'assistant', 'human'],
        required: true,
        },

        message: {
        type: String,
        required: true,
        trim: true,
        },
 
        messageType: {
        type: String,
        enum: ['text', 'image', 'audio', 'document', 'other'],
        default: 'text',
        },

        metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        },
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model('Message', messageSchema);