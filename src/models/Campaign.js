    const mongoose = require('mongoose');

    const campaignSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true,
        trim: true,
        },

        description: {
        type: String,
        default: '',
        trim: true,
        },

        selectionRate: {
        type: Number,
        default: 0.95,
        min: 0,
        max: 1,
        },

        firstBookingDate: {
        type: Date,
        required: true,
        },

        active: {
        type: Boolean,
        default: true,
        },

        services: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
        },
        ],
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model('Campaign', campaignSchema);