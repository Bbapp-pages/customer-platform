const AdminNotification = require('../models/AdminNotification');
const systemLogService = require('./systemLog.service');

const notifyAdmins = async ({ type, message, actor, appointmentId }) => {
  try {
    await AdminNotification.create({
      type,
      message,
      actor,
      appointment: appointmentId || null,
    });
  } catch (error) {
    systemLogService.logError({
      type: 'admin_notification',
      message: error.message,
      meta: { notificationType: type, appointmentId: appointmentId ? String(appointmentId) : null },
    });
  }
};

module.exports = { notifyAdmins };
