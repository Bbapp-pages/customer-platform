const { Resend } = require('resend');

const env = require('../../config/env');

let resendClient;
const getClient = () => {
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
};

const sendMail = async ({ to, subject, html }) => {
  if (!env.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { data, error } = await getClient().emails.send({
    from: env.emailFrom,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
  }

  return data;
};

module.exports = { sendMail };
