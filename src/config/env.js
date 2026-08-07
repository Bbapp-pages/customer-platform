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

    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,

    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,

    whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',

    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,

    calendarProvider:
        process.env.CALENDAR_PROVIDER || 'mock',

    jwtSecret: process.env.JWT_SECRET,

    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',

    adminSeedName: process.env.ADMIN_SEED_NAME || 'Administrador',

    adminSeedEmail: process.env.ADMIN_SEED_EMAIL,

    adminSeedPassword: process.env.ADMIN_SEED_PASSWORD,
    };

    module.exports = env;