const express = require('express');

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.set('trust proxy', true);

const aiRoutes = require('./routes/ai.routes');
const participantRoutes = require(
  './routes/participant.routes'
);
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const agendaRoutes = require('./routes/agenda.routes');
const whatsappRoutes = require(
  './routes/whatsapp.routes'
);
const errorHandler = require('./middlewares/errorHandler.middleware');

app.use(helmet());
app.use(
  cors({
    origin: '*',
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));

app.use(
  '/api/whatsapp',
  whatsappRoutes
);

app.use(
  '/api/campaigns',
  participantRoutes
);

//GEMINI API
app.use('/api/ai', aiRoutes);

// Admin dashboard
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agenda', agendaRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WhatsApp AI Backend is running',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

module.exports = app;