/**
 * Horarios y cupos de "Campaña Facial 2026" (ver instructions.md).
 * Hardcodeado porque hoy solo existe una campaña activa y estos valores
 * son la fuente de la verdad que dio el negocio, no configuración
 * reutilizable entre campañas.
 */

const CLINIC_UTC_OFFSET = '-05:00';

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

const getBusinessHoursForDate = (dateStr) =>
  dateStr >= SCHEDULE_CUTOVER_DATE
    ? BUSINESS_HOURS_FROM_CUTOVER
    : BUSINESS_HOURS_BEFORE_CUTOVER;

module.exports = {
  CLINIC_UTC_OFFSET,
  SCHEDULE_CUTOVER_DATE,
  TOTAL_DAILY_CAP,
  getBusinessHoursForDate,
};
