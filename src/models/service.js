    const mongoose = require('mongoose');

    const serviceSchema = new mongoose.Schema(
    {
        code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        },

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

        durationMinutes: {
        type: Number,
        required: true,
        default: 30,
        },

        dailyLimit: {
        type: Number,
        required: true,
        default: 20,
        },

        price: {
        type: Number,
        default: 0,
        },

        active: {
        type: Boolean,
        default: true,
        },
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model('Service', serviceSchema);