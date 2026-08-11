const crypto = require('crypto');
const Participant = require('../models/Participant');
require('../models/service');
const env = require('../config/env');
const twilioProvider = require('../integrations/whatsapp/twilio.provider');
const systemLogService = require('../services/systemLog.service');
const { toClinicWallClock, addClinicDays } = require('../utils/clinicTime');
const { getCampaignContactHours } = require('../config/campaignSchedule.constants');

const CONTACT_DELAY_MIN_MS = 3 * 60 * 60 * 1000;
const CONTACT_DELAY_MAX_MS = 5 * 60 * 60 * 1000;

const isWithinContactHours = (time, hours) =>
  hours.some((range) => time >= range.start && time < range.end);

// Cada participante espera una cantidad distinta dentro de 3-5h (derivada de su
// propio id, estable entre corridas del cron) — simula que no todos se contactan
// exactamente al mismo tiempo, como haría una persona real.
const getContactDelayMs = (participantId) => {
  const hash = crypto.createHash('md5').update(String(participantId)).digest();
  const fraction = hash.readUInt32BE(0) / 0xffffffff;
  return CONTACT_DELAY_MIN_MS + fraction * (CONTACT_DELAY_MAX_MS - CONTACT_DELAY_MIN_MS);
};

const runCampaignFollowUp = async () => {
  const clinicNow = toClinicWallClock(new Date());
  const { weekday } = addClinicDays(clinicNow.date, 0);
  const contactHours = getCampaignContactHours(weekday);

  if (!isWithinContactHours(clinicNow.time, contactHours)) {
    return;
  }

  const participants = await Participant.find({
    status: 'SELECTED',
    contactedAt: null,
    selectedAt: { $lte: new Date(Date.now() - CONTACT_DELAY_MIN_MS) },
  }).populate('prize.service', 'name');

  for (const participant of participants) {
    if (Date.now() - participant.selectedAt.getTime() < getContactDelayMs(participant._id)) {
      continue;
    }

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
