

// Costa Rica: UTC-06:00 todo el año (no observa horario de verano).
const CLINIC_UTC_OFFSET = '-06:00';

const CLINIC_NAME = 'MÁS SALUD';

const CLINIC_ADDRESS =
  'San José, Costa Rica, Avenida 27, sector de Robledal, en La Uruca (250 metros este del Hotel Irazú)';

const CLINIC_WEBSITE = 'https://mssocios.com/product-category/todos-los-productos/';

// Teléfono de contacto general de la clínica (el que se da cuando preguntan cómo comunicarse).
const CLINIC_PHONE = '+506 4000-0760';

// Número al que se redirige a un cliente cuando: (1) tuvo una mala experiencia
// en su cita y necesita contarlo, o (2) ya usó su beneficio gratuito y quiere
// agendar una cita nueva pagada — el bot no gestiona ninguno de esos dos casos.
const CLINIC_SUPPORT_PHONE = '+506 6119 0181';

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

// Días feriados de Costa Rica con fecha fija (sin los que la ley traslada al
// lunes más cercano, ej. Juan Santamaría/Culturas, para no arriesgar una fecha
// incorrecta). AJUSTAR/AMPLIAR esta lista para que coincida exactamente con
// los días que la clínica realmente cierra — revisar cada año.
const COSTA_RICA_HOLIDAYS = [
  '2026-01-01', // Año Nuevo
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajador
  '2026-07-25', // Anexión del Partido de Nicoya
  '2026-08-02', // Virgen de los Ángeles
  '2026-08-15', // Día de la Madre
  '2026-09-15', // Independencia
  '2026-12-25', // Navidad
];

const isClinicHoliday = (dateStr) => COSTA_RICA_HOLIDAYS.includes(dateStr);

// Modelo de revelación de la campaña: la atención cierra a las 5pm. A esa hora
// se empieza a avisar (de forma escalonada, ver campaignFollowUp.job.js) a
// quienes se registraron ESE mismo día antes del corte de las 4pm. Quien
// escribe después de las 4pm, o en un día que no es hábil (domingo/feriado),
// se avisa en la mañana del siguiente día hábil — nunca el mismo día que
// escribió tarde, para no dar una espera casi nula que delate el resultado.
const REGISTRATION_CUTOFF_TIME = '16:00';
const REVEAL_START_TIME = '17:00';
const NEXT_DAY_REVEAL_TIME = '09:00';

// Cuántos participantes se contactan por cada corrida del cron (cada minuto,
// ver server.js) — así el envío queda repartido en varios minutos en vez de
// salir todo en el mismo instante, que es justo el patrón que Meta marca como
// automatización sospechosa.
const REVEAL_BATCH_SIZE = 3;

const getBusinessHoursForDate = (dateStr) =>
  dateStr >= SCHEDULE_CUTOVER_DATE
    ? BUSINESS_HOURS_FROM_CUTOVER
    : BUSINESS_HOURS_BEFORE_CUTOVER;

module.exports = {
  CLINIC_UTC_OFFSET,
  CLINIC_NAME,
  CLINIC_ADDRESS,
  CLINIC_WEBSITE,
  CLINIC_PHONE,
  CLINIC_SUPPORT_PHONE,
  SCHEDULE_CUTOVER_DATE,
  TOTAL_DAILY_CAP,
  isClinicHoliday,
  REGISTRATION_CUTOFF_TIME,
  REVEAL_START_TIME,
  NEXT_DAY_REVEAL_TIME,
  REVEAL_BATCH_SIZE,
  getBusinessHoursForDate,
};
