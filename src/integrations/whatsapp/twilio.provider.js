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

module.exports = { sendMessage, sendTemplateMessage };
