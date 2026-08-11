    const mongoose = require('mongoose');

    const appointmentSchema = new mongoose.Schema(
    {
        customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true,
        },

        service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
        },

        employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        },

        startTime: {
        type: Date,
        required: true,
        index: true,
        },

        endTime: {
        type: Date,
        required: true,
        },

        status: {
        type: String,
        enum: [
            'pending',
            'confirmed',
            'cancelled',
            'completed',
            'no_show',
        ],
        default: 'pending',
        index: true,
        },

        notes: {
        type: String,
        trim: true,
        },

        calendarEventId: {
        type: String,
        trim: true,
        },

        feedbackRequestedAt: {
        type: Date,
        default: null,
        },

        feedbackResult: {
        type: String,
        enum: ['positive', 'negative'],
        default: null,
        },

        feedbackComment: {
        type: String,
        trim: true,
        default: '',
        },

        feedbackReceivedAt: {
        type: Date,
        default: null,
        },
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model('Appointment', appointmentSchema);