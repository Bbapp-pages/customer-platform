const Participant = require('../models/Participant');
require('../models/service');
const env = require('../config/env');
const twilioProvider = require('../integrations/whatsapp/twilio.provider');
const systemLogService = require('../services/systemLog.service');

const CONTACT_DELAY_MS = 6 * 60 * 60 * 1000;

const runCampaignFollowUp = async () => {
  const participants = await Participant.find({
    status: 'SELECTED',
    contactedAt: null,
    selectedAt: { $lte: new Date(Date.now() - CONTACT_DELAY_MS) },
  }).populate('prize.service', 'name');

  for (const participant of participants) {
    try {
      await twilioProvider.sendTemplateMessage({
        to: participant.phone,
        contentSid: env.twilioContactTemplateSid,
        contentVariables: {
          '1': participant.name,
          '2': participant.prize.service?.name || 'tu tratamiento',
        },
      });

      participant.status = 'CONTACTED';
      participant.contactedAt = new Date();
      await participant.save();

      console.log(`[campaignFollowUp] Contactado: ${participant.phone}`);
    } catch (error) {
      console.error(`[campaignFollowUp] Error contactando a ${participant.phone}:`, error.message);
      systemLogService.logError({
        type: 'campaign_followup',
        message: error.message,
        meta: { phone: participant.phone, participantId: String(participant._id) },
      });
    }
  }
};

module.exports = { runCampaignFollowUp };
