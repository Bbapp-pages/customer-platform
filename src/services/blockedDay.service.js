const BlockedDay = require('../models/BlockedDay');
const Appointment = require('../models/Appointment');
require('../models/customer');
require('../models/service');
const { fromClinicWallClock, toClinicWallClock } = require('../utils/clinicTime');
const { notifyAdmins } = require('./adminNotification.service');
const notificationService = require('./notification.service');
const env = require('../config/env');
const systemLogService = require('./systemLog.service');

const listBlockedDays = async () => BlockedDay.find({}).sort({ date: 1 });

const isDateBlocked = async (dateStr) => Boolean(await BlockedDay.findOne({ date: dateStr }));

// No cuenta las ya canceladas: si alguien canceló su cita antes, no hay nada
// que reagendar por culpa del bloqueo.
const getAffectedAppointments = async (dateStr) => {
  const dayStart = fromClinicWallClock(dateStr, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return Appointment.find({
    startTime: { $gte: dayStart, $lt: dayEnd },
    status: { $nin: ['cancelled'] },
  })
    .populate('customer', 'name phone email')
    .populate('service', 'name')
    .sort({ startTime: 1 });
};

const describeAffected = (appointments) =>
  appointments.map((appointment) => ({
    time: toClinicWallClock(appointment.startTime).time,
    serviceName: appointment.service?.name || 'Sin servicio',
    customerName: appointment.customer?.name || 'Sin nombre',
    customerPhone: appointment.customer?.phone || '—',
    customerEmail: appointment.customer?.email || '—',
  }));

// Bloquea el día y, si ya tenía citas, avisa a los admins (notificación en el
// dashboard) y a gerencia (correo) con el detalle de a quién hay que
// reagendar manualmente — el bloqueo NUNCA cancela ni mueve las citas por su
// cuenta, solo las deja ahí y avisa, porque reagendar es una decisión humana.
const blockDay = async ({ date, reason, admin }) => {
  const existing = await BlockedDay.findOne({ date });
  if (existing) {
    return { alreadyBlocked: true, blockedDay: existing, affected: [] };
  }

  const affectedAppointments = await getAffectedAppointments(date);

  const blockedDay = await BlockedDay.create({
    date,
    reason: reason || '',
    blockedBy: { id: admin._id, name: admin.name, email: admin.email },
  });

  if (affectedAppointments.length > 0) {
    await Promise.all(
      affectedAppointments.map((appointment) => {
        const { time } = toClinicWallClock(appointment.startTime);
        return notifyAdmins({
          type: 'day_blocked',
          message: `${admin.name} bloqueó el día ${date}${reason ? ` (${reason})` : ''}. Hay que reagendar manualmente a ${appointment.customer?.name || 'un paciente'} (${appointment.customer?.phone || 'sin teléfono'}) — tenía cita a las ${time} para ${appointment.service?.name || 'un servicio'}.`,
          actor: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
          appointmentId: appointment._id,
        });
      })
    );

    notificationService
      .sendDayBlockedReport({
        to: env.gerenciaEmail,
        date,
        reason,
        appointments: describeAffected(affectedAppointments),
      })
      .catch((error) => {
        console.error('Day-blocked report email error:', error);
        systemLogService.logError({
          type: 'email_send',
          message: error.message,
          meta: { job: 'blockDay', date },
        });
      });
  }

  return { alreadyBlocked: false, blockedDay, affected: describeAffected(affectedAppointments) };
};

const unblockDay = async (date) => BlockedDay.deleteOne({ date });

module.exports = {
  listBlockedDays,
  isDateBlocked,
  getAffectedAppointments,
  blockDay,
  unblockDay,
};
