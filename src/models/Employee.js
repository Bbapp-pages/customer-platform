    const mongoose = require('mongoose');

    const employeeSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true,
        trim: true,
        },

        phone: {
        type: String,
        trim: true,
        },

        email: {
        type: String,
        trim: true,
        lowercase: true,
        },

        specialties: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
        },
        ],

        active: {
        type: Boolean,
        default: true,
        },
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model('Employee', employeeSchema);