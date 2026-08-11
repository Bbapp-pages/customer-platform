

// Costa Rica: UTC-06:00 todo el año (no observa horario de verano).
const CLINIC_UTC_OFFSET = '-06:00';

const CLINIC_NAME = 'MÁS SALUD';

// TODO: reemplazar con la dirección real de la clínica.
const CLINIC_ADDRESS = 'Costa Rica, Uruca, 250 mts este del Hotel Irazu';

const CLINIC_WEBSITE = 'https://www.massaludlatam.com/';

const SCHEDULE_CUTOVER_DATE = '2026-08-16';

const BUSINESS_HOURS_BEFORE_CUTOVER = [
  { start: '08:00', end: '12:00' },
  { start: '13:00', end: '17:00' },
];

const BUSINESS_HOURS_FROM_CUTOVER = [
  { start: '09:00', end: '12:00' },
  { start: '13:00', end: '19:00' },
];

const TOTAL_DAILY_CAP = 40;

// Ventana horaria en la que el sistema contacta proactivamente a los ganadores
// de la campaña — simula el horario real de alguien llamando/escribiendo, no
// se hace fuera de este rango aunque el participante ya lleve horas elegible.
// Domingo no se contacta a nadie; sábado el horario de la tarde es más corto.
const CAMPAIGN_CONTACT_HOURS_WEEKDAY = [
  { start: '09:00', end: '12:00' },
  { start: '13:00', end: '16:00' },
];

const CAMPAIGN_CONTACT_HOURS_SATURDAY = [
  { start: '09:00', end: '12:00' },
  { start: '13:00', end: '15:00' },
];

const getCampaignContactHours = (weekday) => {
  if (weekday === 0) return [];
  if (weekday === 6) return CAMPAIGN_CONTACT_HOURS_SATURDAY;
  return CAMPAIGN_CONTACT_HOURS_WEEKDAY;
};

const getBusinessHoursForDate = (dateStr) =>
  dateStr >= SCHEDULE_CUTOVER_DATE
    ? BUSINESS_HOURS_FROM_CUTOVER
    : BUSINESS_HOURS_BEFORE_CUTOVER;

module.exports = {
  CLINIC_UTC_OFFSET,
  CLINIC_NAME,
  CLINIC_ADDRESS,
  CLINIC_WEBSITE,
  SCHEDULE_CUTOVER_DATE,
  TOTAL_DAILY_CAP,
  getCampaignContactHours,
  getBusinessHoursForDate,
};
