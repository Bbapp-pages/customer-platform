const express = require('express');
const { webhook } = require('twilio');

console.log('✓ WhatsApp routes loaded');

const whatsappController = require('../controllers/whatsapp.controller');
const env = require('../config/env');

const router = express.Router();

router.post(
  '/webhook',
  webhook({ authToken: env.twilioAuthToken }),
  whatsappController.receiveWebhook
);

module.exports = router;
