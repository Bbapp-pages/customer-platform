  const cron = require('node-cron');
  const app = require('./app');
  const env = require('./config/env');
  const connectDatabase = require('./config/database');
  const { runCampaignFollowUp } = require('./jobs/campaignFollowUp.job');
  const { runAppointmentLifecycle } = require('./jobs/appointmentLifecycle.job');
  const { runDailyPatientReport } = require('./jobs/dailyPatientReport.job');

  const startServer = async () => {
    await connectDatabase();

    cron.schedule('*/15 * * * *', () => {
      runCampaignFollowUp().catch((error) =>
        console.error('[campaignFollowUp] Error inesperado:', error)
      );
    });

    cron.schedule('*/15 * * * *', () => {
      runAppointmentLifecycle().catch((error) =>
        console.error('[appointmentLifecycle] Error inesperado:', error)
      );
    });

    cron.schedule('30 19 * * *', () => {
      runDailyPatientReport().catch((error) =>
        console.error('[dailyPatientReport] Error inesperado:', error)
      );
    }, { timezone: 'America/Costa_Rica' });

    app.listen(env.port, () => {
      console.log(`
  ========================================
  WhatsApp AI Backend
  ========================================
  Environment: ${env.nodeEnv}
  Port:        ${env.port}
  AI Provider: ${env.aiProvider}
  WhatsApp:    ${env.whatsappProvider}
  Calendar:    ${env.calendarProvider}
  ========================================
      `);
    });
  };

  startServer();