const SystemLog = require('../models/SystemLog');

const logError = async ({ type, message, meta }) => {
  try {
    await SystemLog.create({ type, message, meta });
  } catch (error) {
    console.error('[systemLog] No se pudo guardar el log:', error.message);
  }
};

module.exports = { logError };
