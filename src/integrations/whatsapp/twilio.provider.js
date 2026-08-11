const twilio = require('twilio');

const env = require('../../config/env');

let client;
const getClient = () => {
  if (!client) {
    client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }
  return client;
};

const toWhatsAppAddress = (phone) => `whatsapp:+${String(phone).replace(/\D/g, '')}`;

const sendMessage = async ({ to, body }) =>
  getClient().messages.create({
    from: toWhatsAppAddress(env.twilioWhatsappNumber),
    to: toWhatsAppAddress(to),
    body,
  });

const sendTemplateMessage = async ({ to, contentSid, contentVariables }) =>
  getClient().messages.create({
    from: toWhatsAppAddress(env.twilioWhatsappNumber),
    to: toWhatsAppAddress(to),
    contentSid,
    contentVariables: JSON.stringify(contentVariables),
  });

const fetchMedia = async (mediaUrl) => {
  const authHeader =
    'Basic ' + Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64');

  const response = await fetch(mediaUrl, { headers: { Authorization: authHeader } });

  if (!response.ok) {
    throw new Error(`Twilio media fetch error (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return { data: buffer.toString('base64'), mimeType: response.headers.get('content-type') };
};

module.exports = { sendMessage, sendTemplateMessage, fetchMedia };
