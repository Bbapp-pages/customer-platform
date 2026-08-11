const { CLINIC_UTC_OFFSET } = require('../config/campaignSchedule.constants');

const parseOffsetMinutes = (offset) => {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
};

const CLINIC_OFFSET_MINUTES = parseOffsetMinutes(CLINIC_UTC_OFFSET);

const toClinicWallClock = (date) => {
  const local = new Date(date.getTime() + CLINIC_OFFSET_MINUTES * 60000);
  const pad = (n) => String(n).padStart(2, '0');

  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
};

const fromClinicWallClock = (dateStr, timeStr) =>
  new Date(`${dateStr}T${timeStr}:00${CLINIC_UTC_OFFSET}`);

const addClinicDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n) => String(n).padStart(2, '0');

  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    weekday: shifted.getUTCDay(),
  };
};

module.exports = { toClinicWallClock, fromClinicWallClock, addClinicDays };
