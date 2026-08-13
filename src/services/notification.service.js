const resendProvider = require('../integrations/email/resend.provider');
const env = require('../config/env');
const { CLINIC_NAME, CLINIC_ADDRESS, CLINIC_WEBSITE } = require('../config/campaignSchedule.constants');

const buildMapsLink = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const buildWhatsAppLink = (whatsappNumber) =>
  `https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}`;

const buildConfirmationCode = (appointmentId) =>
  String(appointmentId).slice(-8).toUpperCase();

const buildConfirmationHtml = ({ customerName, serviceName, date, time, confirmationCode }) => {
  const mapsLink = buildMapsLink(CLINIC_ADDRESS);
  const whatsappLink = buildWhatsAppLink(env.twilioWhatsappNumber);

  return `
  <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, Arial, sans-serif; color: #1a1a1a;">
    <div style="padding: 24px 24px 0;">
      <p style="margin: 0; font-size: 13px; letter-spacing: 1px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
        ${CLINIC_NAME}
      </p>
      <h1 style="margin: 8px 0 0; font-size: 22px;">Cita confirmada</h1>
    </div>

    <div style="padding: 16px 24px;">
      <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
        Hola ${customerName}, tu cita quedó agendada. Aquí tienes los detalles:
      </p>

      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Servicio</td>
            <td style="text-align: right; font-weight: 600;">${serviceName}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Fecha</td>
            <td style="text-align: right; font-weight: 600;">${date}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Hora</td>
            <td style="text-align: right; font-weight: 600;">${time}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Confirmación</td>
            <td style="text-align: right; font-weight: 600;">#${confirmationCode}</td>
          </tr>
        </table>
      </div>

      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600;">${CLINIC_NAME}</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">${CLINIC_ADDRESS}</p>
        <a href="${mapsLink}" style="font-size: 13px; color: #2563eb; text-decoration: none;">Ver ubicación en Google Maps →</a>
      </div>

      <div style="border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="color: #166534;">${serviceName} (beneficio de campaña)</td>
            <td style="text-align: right; color: #166534;">$0</td>
          </tr>
          <tr>
            <td style="padding-top: 8px; font-weight: 700; color: #166534;">Total a pagar</td>
            <td style="padding-top: 8px; text-align: right; font-weight: 700; color: #166534;">$0 — GRATIS</td>
          </tr>
        </table>
        <p style="margin: 8px 0 0; font-size: 12px; color: #166534;">
          Este beneficio es 100% gratuito. No se realiza ningún cobro por esta cita.
        </p>
      </div>

      <p style="margin: 0 0 16px; font-size: 13px; color: #6b7280;">
        ¿Necesitas cancelar o reprogramar? Escríbenos por WhatsApp con al menos 24 horas de anticipación.
      </p>

      <a href="${whatsappLink}" style="display: block; text-align: center; background: #16a34a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 8px;">
        Escribirnos por WhatsApp
      </a>
    </div>
  </div>
`;
};

const buildRegistrationThankYouHtml = ({ customerName, serviceNames }) => {
  const prizesList = (serviceNames && serviceNames.length ? serviceNames : ['Hollywood Peel', 'Láser CO₂ fraccionado'])
    .map((name) => `<li style="margin-bottom: 4px;">${name}</li>`)
    .join('');

  return `
  <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, Arial, sans-serif; color: #1a1a1a;">
    <div style="padding: 24px 24px 0;">
      <p style="margin: 0; font-size: 13px; letter-spacing: 1px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
        ${CLINIC_NAME}
      </p>
      <h1 style="margin: 8px 0 0; font-size: 22px;">¡${customerName}, ya estás participando! 🍀</h1>
    </div>

    <div style="padding: 16px 24px;">
      <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
        Formas parte de nuestra campaña, en la que puedes ganar <strong>totalmente GRATIS</strong>
        uno de estos tratamientos:
      </p>

      <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 14px; color: #374151;">
        ${prizesList}
      </ul>

      <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
        ¡Mucha suerte! 🍀 Muy pronto te vamos a contactar por WhatsApp para contarte cuál ganaste
        y coordinar tu cita.
      </p>

      <a href="${CLINIC_WEBSITE}" style="display: block; text-align: center; background: #111111; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 8px;">
        Ver todos nuestros servicios
      </a>
    </div>
  </div>
`;
};

const sendRegistrationThankYou = async ({ to, customerName, serviceNames }) => {
  if (!to) {
    console.log(`Skipping registration email for ${customerName}: no email on file`);
    return;
  }

  const html = buildRegistrationThankYouHtml({ customerName, serviceNames });

  await resendProvider.sendMail({
    to,
    subject: `¡${customerName}, ya estás participando! 🍀`,
    html,
  });
};

const sendAppointmentConfirmation = async ({
  to,
  customerName,
  serviceName,
  date,
  time,
  appointmentId,
}) => {
  if (!to) {
    console.log(`Skipping confirmation email for ${customerName}: no email on file`);
    return;
  }

  const html = buildConfirmationHtml({
    customerName,
    serviceName,
    date,
    time,
    confirmationCode: buildConfirmationCode(appointmentId),
  });

  await resendProvider.sendMail({
    to,
    subject: `Cita confirmada – ${serviceName}`,
    html,
  });
};

const buildDailyPatientReportHtml = ({ date, appointments }) => {
  const rows = appointments
    .map(
      (appointment) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${appointment.time}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${appointment.serviceName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${appointment.customerName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${appointment.customerPhone}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${appointment.customerEmail}</td>
          </tr>`
    )
    .join('');

  const body =
    appointments.length === 0
      ? `
      <p style="margin: 0; font-size: 14px; color: #374151;">
        No hay citas programadas para ese día.
      </p>`
      : `
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Hora</th>
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Procedimiento</th>
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Paciente</th>
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Teléfono</th>
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280;">Correo</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>`;

  return `
  <div style="max-width: 640px; margin: 0 auto; font-family: -apple-system, Arial, sans-serif; color: #1a1a1a;">
    <div style="padding: 24px 24px 0;">
      <p style="margin: 0; font-size: 13px; letter-spacing: 1px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
        ${CLINIC_NAME}
      </p>
      <h1 style="margin: 8px 0 0; font-size: 22px;">Citas de mañana</h1>
      <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${date}</p>
    </div>

    <div style="padding: 16px 24px;">
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
        ${body}
      </div>
    </div>
  </div>
`;
};

const sendDailyPatientReport = async ({ to, date, appointments }) => {
  const html = buildDailyPatientReportHtml({ date, appointments });

  return resendProvider.sendMail({
    to,
    subject: `Citas de mañana — ${date}`,
    html,
  });
};

module.exports = { sendAppointmentConfirmation, sendRegistrationThankYou, sendDailyPatientReport };
