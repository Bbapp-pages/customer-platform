    require('dotenv').config();

    const env = {
    nodeEnv: process.env.NODE_ENV || 'development',

    port: Number(process.env.PORT) || 3000,

    mongoUri: process.env.MONGODB_URI,

    aiProvider: process.env.AI_PROVIDER || 'gemini',

    geminiApiKey: process.env.GEMINI_API_KEY,

    geminiModel:
        process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',

    whatsappProvider:
        process.env.WHATSAPP_PROVIDER || 'mock',

    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,

    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,

    twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,

    twilioContactTemplateSid: process.env.TWILIO_CONTACT_TEMPLATE_SID,

    resendApiKey: process.env.RESEND_API_KEY,

    emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',

    calendarProvider:
        process.env.CALENDAR_PROVIDER || 'mock',

    jwtSecret: process.env.JWT_SECRET,

    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',

    adminSeedName: process.env.ADMIN_SEED_NAME || 'Administrador',

    adminSeedEmail: process.env.ADMIN_SEED_EMAIL,

    adminSeedPassword: process.env.ADMIN_SEED_PASSWORD,
    };

    module.exports = env;