  const app = require('./app');
  const env = require('./config/env');
  const connectDatabase = require('./config/database');

  const startServer = async () => {
    await connectDatabase();

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