const { addClinicDays, toClinicWallClock, fromClinicWallClock } = require('../utils/clinicTime');
const {
  isClinicHoliday,
  REGISTRATION_CUTOFF_TIME,
  REVEAL_START_TIME,
  NEXT_DAY_REVEAL_TIME,
} = require('../config/campaignSchedule.constants');

const isClinicBusinessDay = (dateStr) => {
  const { weekday } = addClinicDays(dateStr, 0);
  return weekday !== 0 && !isClinicHoliday(dateStr);
};

const nextClinicBusinessDay = (dateStr) => {
  let candidate = addClinicDays(dateStr, 1).date;
  while (!isClinicBusinessDay(candidate)) {
    candidate = addClinicDays(candidate, 1).date;
  }
  return candidate;
};

// Se calcula una sola vez, en el momento del registro, y queda fijo en
// participant.revealAt — así el cron nunca tiene que reevaluar reglas de
// horario/feriados sobre una fecha pasada, y el resultado es auditable.
const computeRevealAt = (registeredAt) => {
  const wall = toClinicWallClock(registeredAt);

  if (isClinicBusinessDay(wall.date) && wall.time < REGISTRATION_CUTOFF_TIME) {
    return fromClinicWallClock(wall.date, REVEAL_START_TIME);
  }

  return fromClinicWallClock(nextClinicBusinessDay(wall.date), NEXT_DAY_REVEAL_TIME);
};

module.exports = { isClinicBusinessDay, nextClinicBusinessDay, computeRevealAt };
