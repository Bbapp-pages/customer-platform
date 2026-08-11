    const mongoose = require('mongoose');

    const customerSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true,
        trim: true,
        },

        phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
        },

        email: {
        type: String,
        trim: true,
        lowercase: true,
        },

        notes: {
        type: String,
        trim: true,
        },

        preferences: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
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

    module.exports = mongoose.model('Customer', customerSchema);