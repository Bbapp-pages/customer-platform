const Appointment = require('../models/Appointment');
const Participant = require('../models/Participant');
require('../models/service');
require('../models/customer');
const env = require('../config/env');
const twilioProvider = require('../integrations/whatsapp/twilio.provider');
const systemLogService = require('../services/systemLog.service');

const FEEDBACK_DELAY_MS = 60 * 60 * 1000;

// Una vez pasó la hora de la cita, se marca como completada y el beneficio de
// campaña (si aplica) queda como ya usado — así una cita futura del mismo
// participante siempre tiene que ser una cita nueva y pagada, no otra gratuita.
const markCompletedAppointments = async () => {
  const appointments = await Appointment.find({
    status: { $in: ['pending', 'confirmed'] },
    endTime: { $lte: new Date() },
  });

  for (const appointment of appointments) {
    appointment.status = 'completed';
    await appointment.save();

    await Participant.updateOne(
      { appointment: appointment._id },
      { status: 'ATTENDED', 'prize.status': 'REDEEMED' }
    );
  }
};

const requestPendingFeedback = async () => {
  const threshold = new Date(Date.now() - FEEDBACK_DELAY_MS);

  const appointments = await Appointment.find({
    status: 'completed',
    endTime: { $lte: threshold },
    feedbackRequestedAt: null,
  })
    .populate('customer', 'name phone')
    .populate('service', 'name');

  for (const appointment of appointments) {
    try {
      await twilioProvider.sendTemplateMessage({
        to: appointment.customer.phone,
        contentSid: env.twilioFeedbackTemplateSid,
        contentVariables: {
          '1': appointment.customer.name,
          '2': appointment.service?.name || 'tu tratamiento',
        },
      });

      appointment.feedbackRequestedAt = new Date();
      await appointment.save();

      console.log(`[appointmentLifecycle] Retroalimentación solicitada: ${appointment.customer.phone}`);
    } catch (error) {
      console.error(
        `[appointmentLifecycle] Error solicitando retroalimentación a ${appointment.customer?.phone}:`,
        error.message
      );
      systemLogService.logError({
        type: 'campaign_followup',
        message: error.message,
        meta: { appointmentId: String(appointment._id) },
      });
    }
  }
};

const runAppointmentLifecycle = async () => {
  await markCompletedAppointments();
  await requestPendingFeedback();
};

module.exports = { runAppointmentLifecycle };
