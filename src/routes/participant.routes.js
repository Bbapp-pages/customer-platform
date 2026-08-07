    const express = require('express');

    const participantController = require(
    '../controllers/participant.controller'
    );

    const router = express.Router();

    router.post(
    '/:campaignId/participants',
    participantController.createParticipant
    );

    module.exports = router;