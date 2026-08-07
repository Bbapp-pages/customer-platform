    const Participant = require('../models/Participant');
    const Campaign = require('../models/Campaign');

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
    };