    const mongoose = require('mongoose');

    const participantSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true,
        trim: true,
        },

        documentId: {
        type: String,
        required: true,
        trim: true,
        },

        phone: {
        type: String,
        required: true,
        trim: true,
        },

        email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        },

        campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true,
        },

        status: {
        type: String,
        enum: [
            'REGISTERED',
            'SELECTED',
            'CONTACTED',
            'SCHEDULED',
            'ATTENDED',
            'NO_SHOW',
            'CANCELLED',
            'EXPIRED',
        ],
        default: 'REGISTERED',
        },

        prize: {
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            default: null,
        },

        status: {
            type: String,
            enum: [
            'AVAILABLE',
            'SCHEDULED',
            'REDEEMED',
            'EXPIRED',
            ],
            default: 'AVAILABLE',
        },
        },

        appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        default: null,
        },

        selectedAt: {
        type: Date,
        default: null,
        },

        // Momento exacto (calculado una sola vez al registrarse, ver
        // campaignReveal.service.js) en que se le avisará el resultado. El cron
        // de campaignFollowUp.job.js nunca contacta antes de esta fecha/hora.
        revealAt: {
        type: Date,
        default: null,
        },

        skinConcern: {
        type: String,
        enum: [
            'MANCHAS_PIGMENTACION',
            'CICATRICES_ACNE',
            'ARRUGAS_LINEAS',
            'TEXTURA_POROS',
            'REJUVENECIMIENTO_GENERAL',
            'OTRO',
        ],
        default: null,
        },

        skinConcernDetail: {
        type: String,
        trim: true,
        default: null,
        },

        contactedAt: {
        type: Date,
        default: null,
        },
    },
    {
        timestamps: true,
    }
    );

    participantSchema.index(
    { campaign: 1, documentId: 1 },
    { unique: true }
    );

    participantSchema.index(
    { campaign: 1, phone: 1 }
    );

    module.exports = mongoose.model(
    'Participant',
    participantSchema
    );