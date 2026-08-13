const Participant = require('../models/Participant');
require('../models/service');
const env = require('../config/env');
const twilioProvider = require('../integrations/whatsapp/twilio.provider');
const systemLogService = require('../services/systemLog.service');
const systemSettingService = require('../services/systemSetting.service');
const { REVEAL_BATCH_SIZE } = require('../config/campaignSchedule.constants');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Como el cron ahora corre cada minuto (antes cada 15) y esta función espera
// varios segundos entre envíos a propósito, una corrida lenta (Twilio con
// latencia, lote lleno) podría seguir viva cuando arranca la siguiente. Este
// guard evita que dos corridas se pisen y contacten al mismo participante dos
// veces.
let isRunning = false;

// Envía el mensaje real de "ya ganaste" a un participante puntual y actualiza su
// estado. La usan tanto el cron automático como el botón "Contactar ahora" del
// dashboard (que en admin.controller.js queda bloqueado hasta participant.revealAt,
// así que ambos caminos respetan la misma regla de no revelar antes de tiempo).
const contactParticipant = async (participant) => {
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
};

// Cada corrida (cada minuto, ver server.js) solo contacta a un lote pequeño de
// los que ya llegaron a su participant.revealAt — nunca a todos de una vez. Así,
// una cola de 20 personas que se revela a las 5pm se termina de avisar en pocos
// minutos, escalonada, en vez de salir como un envío masivo simultáneo (el
// patrón que Meta marca como automatización sospechosa).
const runCampaignFollowUp = async () => {
  if (isRunning) {
    return;
  }
  isRunning = true;

  try {
    if (!(await systemSettingService.isAiEnabled())) {
      return;
    }

    // revealAt: null también cuenta como "ya corresponde": cubre cualquier participante SELECTED
    // que haya quedado sin revealAt (ej. de antes de este cambio, o creado por otro camino) — así
    // nunca se queda atascado para siempre en vez de fallar en silencio.
    const participants = await Participant.find({
      status: 'SELECTED',
      contactedAt: null,
      $or: [{ revealAt: { $lte: new Date() } }, { revealAt: null }],
    })
      .sort({ selectedAt: 1 })
      .limit(REVEAL_BATCH_SIZE)
      .populate('prize.service', 'name');

    for (let i = 0; i < participants.length; i += 1) {
      const participant = participants[i];

      try {
        await contactParticipant(participant);
        console.log(`[campaignFollowUp] Contactado: ${participant.phone}`);
      } catch (error) {
        console.error(`[campaignFollowUp] Error contactando a ${participant.phone}:`, error.message);
        systemLogService.logError({
          type: 'campaign_followup',
          message: error.message,
          meta: { phone: participant.phone, participantId: String(participant._id) },
        });
      }

      // Pequeña espera aleatoria entre envíos del mismo lote (nunca después del
      // último), para que ni siquiera dentro de una sola corrida salgan pegados.
      if (i < participants.length - 1) {
        await sleep(5000 + Math.random() * 10000);
      }
    }
  } finally {
    isRunning = false;
  }
};

module.exports = { runCampaignFollowUp, contactParticipant };
