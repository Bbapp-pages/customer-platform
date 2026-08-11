    const express = require('express');

    const participantController = require(
    '../controllers/participant.controller'
    );
    const { protect } = require('../middlewares/auth.middleware');

    const router = express.Router();

    // Público — usado por la página de registro de campaña, sin login.
    router.get('/active', participantController.getActivePublicCampaign);
    router.post('/active/register', participantController.registerParticipant);

    // Admin — usado por el dashboard, requiere login.
    router.post(
    '/:campaignId/participants',
    protect,
    participantController.createParticipant
    );

    module.exports = router;