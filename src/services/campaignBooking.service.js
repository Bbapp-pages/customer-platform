const Campaign = require('../models/Campaign');
const Participant = require('../models/Participant');
const Appointment = require('../models/Appointment');
require('../models/service');
require('../models/customer');

const { findOrCreateCustomer } = require('../controllers/agenda.controller');
const {
  TOTAL_DAILY_CAP,
  getBusinessHoursForDate,
} = require('../config/campaignSchedule.constants');
const { toClinicWallClock, fromClinicWallClock } = require('../utils/clinicTime');
const notificationService = require('./notification.service');
const systemLogService = require('./systemLog.service');

const ELIGIBLE_STATUSES = ['SELECTED', 'CONTACTED'];

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

// El modelo no siempre devuelve el code exacto (p. ej. "Hollywood Peel" o
// "hollywood-peel" en vez de "HOLLYWOOD_PEEL"), así que se normaliza a mayúsculas
// con guion bajo antes de comparar contra Service.code.
const normalizeServiceCode = (code) =>
  String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getActiveCampaign = async () => Campaign.findOne({ active: true }).populate('services');

const findParticipantByPhone = async (campaignId, phone) => {
  const normalized = normalizePhone(phone);

  const participants = await Participant.find({ campaign: campaignId })
    .populate('prize.service')
    .populate('appointment');

  return participants.find((p) => normalizePhone(p.phone) === normalized) || null;
};

const describeAppointment = (appointment) => {
  if (!appointment) {
    return null;
  }

  const { date, time } = toClinicWallClock(appointment.startTime);

  return { id: String(appointment._id), date, time, status: appointment.status };
};

const listServices = async () => {
  const campaign = await getActiveCampaign();

  if (!campaign) {
    return { services: [] };
  }

  return {
    services: campaign.services
      .filter((service) => service.active)
      .map((service) => ({
        code: service.code,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
      })),
  };
};

const checkEligibility = async ({ phone }) => {
  const campaign = await getActiveCampaign();

  if (!campaign) {
    return { eligible: false, reason: 'no_active_campaign' };
  }

  const participant = await findParticipantByPhone(campaign._id, phone);

  if (!participant) {
    return { eligible: false, reason: 'not_a_participant' };
  }

  const eligible =
    ELIGIBLE_STATUSES.includes(participant.status) &&
    participant.prize.status === 'AVAILABLE';

  return {
    eligible,
    reason: eligible ? null : `status_${participant.status}_prize_${participant.prize.status}`,
    participant: { id: String(participant._id), name: participant.name, status: participant.status },
    service: participant.prize.service
      ? { code: participant.prize.service.code, name: participant.prize.service.name }
      : null,
    prizeStatus: participant.prize.status,
    existingAppointment: describeAppointment(participant.appointment),
  };
};

// Los cupos diarios (20/servicio, 40 total) son mayores que la cantidad de
// franjas de 30 min disponibles en el día, así que varios pacientes SÍ
// comparten la misma franja horaria a propósito (varios profesionales en
// paralelo) — el cupo es únicamente por día, nunca por franja individual.
const getAvailableSlots = async ({ serviceCode, date, excludeAppointmentId }) => {
  const campaign = await getActiveCampaign();

  if (!campaign) {
    return { available: false, slots: [], reason: 'no_active_campaign' };
  }

  const service = campaign.services.find(
    (s) => s.code === normalizeServiceCode(serviceCode)
  );

  if (!service) {
    return { available: false, slots: [], reason: 'service_not_in_campaign' };
  }

  const dayStart = fromClinicWallClock(date, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const filter = {
    startTime: { $gte: dayStart, $lt: dayEnd },
    status: { $ne: 'cancelled' },
  };

  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }

  const campaignServiceIds = campaign.services.map((s) => String(s._id));
  const dayAppointments = (await Appointment.find(filter)).filter((a) =>
    campaignServiceIds.includes(String(a.service))
  );

  const totalCount = dayAppointments.length;
  const serviceCount = dayAppointments.filter(
    (a) => String(a.service) === String(service._id)
  ).length;

  if (totalCount >= TOTAL_DAILY_CAP) {
    return { available: false, slots: [], reason: 'day_full' };
  }

  if (serviceCount >= service.dailyLimit) {
    return { available: false, slots: [], reason: 'service_full' };
  }

  const now = toClinicWallClock(new Date());
  const slots = [];

  for (const window of getBusinessHoursForDate(date)) {
    const startMin = timeToMinutes(window.start);
    const endMin = timeToMinutes(window.end);

    for (let t = startMin; t + service.durationMinutes <= endMin; t += service.durationMinutes) {
      const slotTime = minutesToTime(t);

      if (date === now.date && slotTime <= now.time) {
        continue;
      }

      slots.push(slotTime);
    }
  }

  return {
    available: slots.length > 0,
    slots,
    remainingCapacity: Math.min(
      service.dailyLimit - serviceCount,
      TOTAL_DAILY_CAP - totalCount
    ),
    service: { code: service.code, name: service.name },
  };
};

const bookAppointment = async ({ phone, name, serviceCode, date, time }) => {
  const eligibility = await checkEligibility({ phone });

  if (!eligibility.eligible) {
    return {
      success: false,
      error: 'not_eligible',
      message: 'Este número no tiene un beneficio disponible para agendar.',
    };
  }

  if (eligibility.existingAppointment && eligibility.existingAppointment.status !== 'cancelled') {
    return {
      success: false,
      error: 'already_scheduled',
      message: 'Este beneficio ya tiene una cita agendada.',
    };
  }

  if (!eligibility.service) {
    return {
      success: false,
      error: 'no_prize_service',
      message: 'Este participante no tiene un servicio asignado como beneficio.',
    };
  }

  if (eligibility.service.code !== normalizeServiceCode(serviceCode)) {
    return {
      success: false,
      error: 'wrong_service',
      message: `El beneficio de este participante es para ${eligibility.service.name}.`,
    };
  }

  const slotsResult = await getAvailableSlots({ serviceCode, date });

  if (!slotsResult.slots.includes(time)) {
    return {
      success: false,
      error: 'slot_unavailable',
      message: 'Ese horario ya no está disponible.',
    };
  }

  const campaign = await getActiveCampaign();
  const service = campaign.services.find((s) => s.code === eligibility.service.code);
  const participant = await findParticipantByPhone(campaign._id, phone);

  const customer = await findOrCreateCustomer({ phone, name: name || participant.name });

  const startTime = fromClinicWallClock(date, time);
  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);

  const appointment = await Appointment.create({
    customer: customer._id,
    service: service._id,
    startTime,
    endTime,
    status: 'confirmed',
    notes: campaign.name,
  });

  participant.status = 'SCHEDULED';
  participant.prize.status = 'SCHEDULED';
  participant.appointment = appointment._id;
  await participant.save();

  notificationService
    .sendAppointmentConfirmation({
      to: participant.email,
      customerName: participant.name,
      serviceName: service.name,
      date,
      time,
      appointmentId: appointment._id,
    })
    .catch((error) => {
      console.error('Appointment confirmation email error:', error);
      systemLogService.logError({
        type: 'email_send',
        message: error.message,
        meta: { appointmentId: String(appointment._id) },
      });
    });

  return {
    success: true,
    appointment: { id: String(appointment._id), date, time, service: service.name },
    message: `Cita confirmada para ${service.name} el ${date} a las ${time}.`,
  };
};

const cancelAppointment = async ({ phone }) => {
  const campaign = await getActiveCampaign();

  if (!campaign) {
    return { success: false, error: 'no_active_campaign', message: 'No hay campaña activa.' };
  }

  const participant = await findParticipantByPhone(campaign._id, phone);

  if (!participant || !participant.appointment || participant.appointment.status === 'cancelled') {
    return { success: false, error: 'no_appointment', message: 'No encontré una cita activa para este número.' };
  }

  participant.appointment.status = 'cancelled';
  await participant.appointment.save();

  participant.status = 'CANCELLED';
  participant.prize.status = 'EXPIRED';
  await participant.save();

  return {
    success: true,
    forfeited: true,
    message: 'La cita fue cancelada. Este beneficio queda perdido y no puede reprogramarse.',
  };
};

const rescheduleAppointment = async ({ phone, date, time }) => {
  const campaign = await getActiveCampaign();

  if (!campaign) {
    return { success: false, error: 'no_active_campaign', message: 'No hay campaña activa.' };
  }

  const participant = await findParticipantByPhone(campaign._id, phone);

  if (!participant || !participant.appointment) {
    return { success: false, error: 'no_appointment', message: 'No encontré una cita activa para este número.' };
  }

  if (participant.prize.status !== 'SCHEDULED') {
    return {
      success: false,
      error: 'benefit_forfeited',
      message: 'Este beneficio ya no puede reprogramarse.',
    };
  }

  const serviceCode = participant.prize.service.code;

  const slotsResult = await getAvailableSlots({
    serviceCode,
    date,
    excludeAppointmentId: participant.appointment._id,
  });

  if (!slotsResult.slots.includes(time)) {
    return {
      success: false,
      error: 'slot_unavailable',
      message: 'Ese horario no está disponible.',
    };
  }

  const service = campaign.services.find((s) => s.code === serviceCode);
  const startTime = fromClinicWallClock(date, time);
  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);

  participant.appointment.startTime = startTime;
  participant.appointment.endTime = endTime;
  await participant.appointment.save();

  return {
    success: true,
    appointment: { date, time, service: service.name },
    message: `Cita reprogramada para el ${date} a las ${time}.`,
  };
};

// Ya no existe un formulario web para el registro — el cliente da sus datos
// por chat y el servicio se asigna al azar entre los activos de la campaña.
// A propósito NO se revela aquí cuál le tocó: eso se anuncia después, en el
// contacto proactivo (campaignFollowUp.job.js ya usa el nombre del servicio
// asignado en su mensaje).
const registerParticipantViaChat = async ({ phone, name, documentId, email }) => {
  const campaign = await getActiveCampaign();

  if (!campaign) {
    return { success: false, error: 'no_active_campaign', message: 'No hay campaña activa en este momento.' };
  }

  const existingByPhone = await findParticipantByPhone(campaign._id, phone);
  if (existingByPhone) {
    return { success: false, error: 'already_registered', message: 'Este número ya está registrado en la campaña.' };
  }

  const existingByDocument = await Participant.findOne({ campaign: campaign._id, documentId });
  if (existingByDocument) {
    return { success: false, error: 'already_registered', message: 'Ese documento ya está registrado en la campaña.' };
  }

  const activeServices = campaign.services.filter((service) => service.active);
  if (activeServices.length === 0) {
    return { success: false, error: 'no_services', message: 'La campaña no tiene servicios disponibles.' };
  }

  const service = activeServices[Math.floor(Math.random() * activeServices.length)];

  const participant = await Participant.create({
    name,
    documentId,
    phone,
    email,
    campaign: campaign._id,
    status: 'SELECTED',
    prize: { service: service._id, status: 'AVAILABLE' },
    selectedAt: new Date(),
  });

  notificationService
    .sendRegistrationThankYou({
      to: email,
      customerName: name,
      serviceNames: activeServices.map((s) => s.name),
    })
    .catch((error) => {
      console.error('Registration thank-you email error:', error);
      systemLogService.logError({
        type: 'email_send',
        message: error.message,
        meta: { participantId: String(participant._id) },
      });
    });

  return { success: true };
};

const findAppointmentAwaitingFeedback = async (phone) => {
  const normalized = normalizePhone(phone);

  const appointments = await Appointment.find({
    feedbackRequestedAt: { $ne: null },
    feedbackResult: null,
  })
    .sort({ endTime: -1 })
    .populate('customer', 'name phone')
    .populate('service', 'name');

  return (
    appointments.find((appointment) => normalizePhone(appointment.customer?.phone) === normalized) ||
    null
  );
};

const findPendingFeedbackSummary = async ({ phone }) => {
  const appointment = await findAppointmentAwaitingFeedback(phone);

  if (!appointment) {
    return null;
  }

  return {
    serviceName: appointment.service?.name || 'tu tratamiento',
    date: toClinicWallClock(appointment.startTime).date,
  };
};

const recordAppointmentFeedback = async ({ phone, result, comment }) => {
  const appointment = await findAppointmentAwaitingFeedback(phone);

  if (!appointment) {
    return {
      success: false,
      error: 'no_pending_feedback',
      message: 'No encontré una cita reciente de este número pendiente de retroalimentación.',
    };
  }

  appointment.feedbackResult = result;
  appointment.feedbackComment = comment || '';
  appointment.feedbackReceivedAt = new Date();
  await appointment.save();

  return { success: true, result };
};

module.exports = {
  getActiveCampaign,
  listServices,
  checkEligibility,
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  registerParticipantViaChat,
  findPendingFeedbackSummary,
  recordAppointmentFeedback,
};
