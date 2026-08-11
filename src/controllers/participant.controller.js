    const Participant = require('../models/Participant');
    const Campaign = require('../models/Campaign');
    const env = require('../config/env');
    const { getActiveCampaign } = require('../services/campaignBooking.service');
    const { CLINIC_ADDRESS } = require('../config/campaignSchedule.constants');

    const getActivePublicCampaign = async (req, res, next) => {
    try {
        const campaign = await getActiveCampaign();

        if (!campaign) {
        return res.status(404).json({
            success: false,
            message: 'No hay ninguna campaña activa en este momento',
        });
        }

        return res.status(200).json({
        success: true,
        data: {
            name: campaign.name,
            description: campaign.description,
            whatsappNumber: env.twilioWhatsappNumber,
            address: CLINIC_ADDRESS,
            services: campaign.services
            .filter((s) => s.active)
            .map((s) => ({ id: s._id, name: s.name, description: s.description })),
        },
        });
    } catch (error) {
        next(error);
    }
    };

    const registerParticipant = async (req, res, next) => {
    try {
        const { name, documentId, phone, email, serviceId } = req.body;

        if (!name || !documentId || !phone || !email || !serviceId) {
        return res.status(400).json({
            success: false,
            message:
            'Faltan datos: nombre, documento, teléfono, correo y servicio son obligatorios.',
        });
        }

        const campaign = await getActiveCampaign();

        if (!campaign) {
        return res.status(404).json({
            success: false,
            message: 'No hay ninguna campaña activa en este momento',
        });
        }

        const validService = campaign.services.some(
        (s) => String(s._id) === String(serviceId)
        );

        if (!validService) {
        return res.status(400).json({
            success: false,
            message: 'Servicio inválido',
        });
        }

        const existingParticipant = await Participant.findOne({
        campaign: campaign._id,
        documentId,
        });

        if (existingParticipant) {
        return res.status(409).json({
            success: false,
            message: 'Ya estás registrado en esta campaña',
        });
        }

        await Participant.create({
        name,
        documentId,
        phone,
        email,
        campaign: campaign._id,
        status: 'SELECTED',
        prize: { service: serviceId, status: 'AVAILABLE' },
        selectedAt: new Date(),
        });

        return res.status(201).json({
        success: true,
        message: '¡Listo! Ya puedes agendar tu cita por WhatsApp.',
        data: { whatsappNumber: env.twilioWhatsappNumber },
        });
    } catch (error) {
        next(error);
    }
    };

    const createParticipant = async (req, res, next) => {
    try {
        const { campaignId } = req.params;

        const {
        name,
        documentId,
        phone,
        email,
        } = req.body;

        // Validación básica
        if (!name || !documentId || !phone || !email) {
        return res.status(400).json({
            success: false,
            message:
            'name, documentId, phone and email are required',
        });
        }

        // Verificar campaña
        const campaign = await Campaign.findById(campaignId);

        if (!campaign) {
        return res.status(404).json({
            success: false,
            message: 'Campaign not found',
        });
        }

        if (!campaign.active) {
        return res.status(400).json({
            success: false,
            message: 'Campaign is not active',
        });
        }

        // Verificar si ya está registrado
        const existingParticipant =
        await Participant.findOne({
            campaign: campaignId,
            documentId,
        });

        if (existingParticipant) {
        return res.status(409).json({
            success: false,
            message:
            'Participant is already registered in this campaign',
            data: {
            participantId: existingParticipant._id,
            },
        });
        }

        // Crear participante
        const participant =
        await Participant.create({
            name,
            documentId,
            phone,
            email,
            campaign: campaignId,
            status: 'REGISTERED',
        });

        return res.status(201).json({
        success: true,
        message: 'Participant registered successfully',
        data: {
            participantId: participant._id,
            status: participant.status,
        },
        });
    } catch (error) {
        next(error);
    }
    };

    module.exports = {
    createParticipant,
    getActivePublicCampaign,
    registerParticipant,
    };