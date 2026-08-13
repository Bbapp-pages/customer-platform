const Appointment = require('../models/Appointment');
require('../models/customer');
require('../models/service');
const { toClinicWallClock, fromClinicWallClock, addClinicDays } = require('../utils/clinicTime');
const env = require('../config/env');
const notificationService = require('../services/notification.service');
const systemLogService = require('../services/systemLog.service');

const formatDateEs = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

// Reporte interno para gerencia con la lista de pacientes agendados para el
// día siguiente (hora de la clínica). Es un reporte administrativo, no un
// mensaje de WhatsApp automatizado, así que se envía siempre, sin importar
// el estado del switch de automatización de mensajería (kill switch aparte).
const runDailyPatientReport = async () => {
  const today = toClinicWallClock(new Date()).date;
  const tomorrow = addClinicDays(today, 1).date;

  const dayStart = fromClinicWallClock(tomorrow, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  try {
    const appointments = await Appointment.find({
      status: { $in: ['pending', 'confirmed'] },
      startTime: { $gte: dayStart, $lt: dayEnd },
    })
      .populate('customer', 'name phone email')
      .populate('service', 'name')
      .sort({ startTime: 1 });

    const mapped = appointments.map((appointment) => ({
      time: toClinicWallClock(appointment.startTime).time,
      serviceName: appointment.service?.name || 'Sin servicio',
      customerName: appointment.customer?.name || 'Sin nombre',
      customerPhone: appointment.customer?.phone || '—',
      customerEmail: appointment.customer?.email || '—',
    }));

    await notificationService.sendDailyPatientReport({
      to: env.gerenciaEmail,
      date: formatDateEs(tomorrow),
      appointments: mapped,
    });

    console.log(`[dailyPatientReport] Reporte enviado (${mapped.length} citas) para ${tomorrow}`);
  } catch (error) {
    console.error('[dailyPatientReport] Error enviando reporte:', error.message);
    systemLogService.logError({
      type: 'email_send',
      message: error.message,
      meta: { job: 'dailyPatientReport' },
    });
  }
};

module.exports = { runDailyPatientReport };
