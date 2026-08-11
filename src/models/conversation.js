    const mongoose = require('mongoose');

    const conversationSchema = new mongoose.Schema(
    {
        customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true,
        },

        channel: {
        type: String,
        enum: ['whatsapp'],
        default: 'whatsapp',
        },

        status: {
        type: String,
        enum: ['active', 'closed', 'human'],
        default: 'active',
        },

        lastMessageAt: {
        type: Date,
        },
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model(
    'Conversation',
    conversationSchema
    );