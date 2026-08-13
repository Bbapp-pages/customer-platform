const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTH_NAMES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // week starts on Monday
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayHeader(date) {
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
}

export function formatTime(date) {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function toISODateOnly(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Las citas solo se agendan por media hora (:00/:30).
export function roundToHalfHour(date) {
  const result = new Date(date);
  const minutes = result.getMinutes();
  result.setMinutes(minutes < 30 ? 0 : 30, 0, 0);
  return result;
}

// Mismo rango que muestra la cuadrícula semanal de Agenda.jsx (8am-8pm) — un
// <select> con estas opciones, en vez de un input de hora libre, es la única
// forma de que sea IMPOSIBLE elegir un minuto que no sea :00/:30 (el atributo
// step de datetime-local no lo garantiza: varios navegadores igual dejan
// desplazar el picker nativo por cualquier minuto).
export const HALF_HOUR_TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
});

export function toTimeSelectValue(date) {
  const rounded = roundToHalfHour(date);
  const pad = (n) => String(n).padStart(2, '0');
  const value = `${pad(rounded.getHours())}:${pad(rounded.getMinutes())}`;

  if (HALF_HOUR_TIME_OPTIONS.includes(value)) {
    return value;
  }

  return value < HALF_HOUR_TIME_OPTIONS[0]
    ? HALF_HOUR_TIME_OPTIONS[0]
    : HALF_HOUR_TIME_OPTIONS[HALF_HOUR_TIME_OPTIONS.length - 1];
}
