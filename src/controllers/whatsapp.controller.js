const { twiml } = require('twilio');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const { findOrCreateCustomer } = require('./agenda.controller');
const geminiAgent = require('../integrations/ai/gemini-agent');
const whatsappProvider = require('../integrations/whatsapp/twilio.provider');
const systemLogService = require('../services/systemLog.service');

// Twilio espera una respuesta TwiML al webhook, no un 200 de texto plano —
// si no, intenta interpretar el cuerpo de la respuesta y termina reenviándolo
// como si fuera un mensaje (por eso aparecía un "OK" después de cada respuesta).
const respondOk = (res) => {
  const empty = new twiml.MessagingResponse();
  res.type('text/xml');
  return res.status(200).send(empty.toString());
};

const SUPPORTED_MEDIA_TYPES = ['image', 'audio', 'document'];
const HISTORY_LIMIT = 20;

const UNSUPPORTED_TYPE_REPLY =
  'Por ahora solo puedo leer mensajes de texto. ¿Puedes escribirme lo que necesitas?';
const FALLBACK_ERROR_REPLY =
  'Estamos teniendo un problema técnico. Un asesor te va a contactar pronto.';

const mapMediaType = (mimeType) => {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

const findOrCreateActiveConversation = async (customerId) => {
  const latest = await Conversation.findOne({ customer: customerId }).sort({ createdAt: -1 });

  if (latest && latest.status !== 'closed') {
    return latest;
  }

  return Conversation.create({ customer: customerId, channel: 'whatsapp', status: 'active' });
};

const getRecentMessages = async (conversationId) => {
  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT);

  return messages.reverse();
};

const receiveWebhook = async (req, res) => {
  try {
    const phone = (req.body.From || '').replace(/^whatsapp:/, '').replace(/\D/g, '');

    if (!phone) {
      // Callbacks de estado (statuses) u otros eventos que no traen un mensaje.
      return respondOk(res);
    }

    const contactName = req.body.ProfileName || phone;
    const body = req.body.Body;
    const numMedia = Number(req.body.NumMedia || 0);
    const isText = numMedia === 0 && !!body;
    const mediaType = numMedia > 0 ? mapMediaType(req.body.MediaContentType0) : null;

    const customer = await findOrCreateCustomer({ phone, name: contactName });
    const conversation = await findOrCreateActiveConversation(customer._id);

    await Message.create({
      conversation: conversation._id,
      sender: 'customer',
      message: isText ? body : `[${mediaType || 'other'}]`,
      messageType: SUPPORTED_MEDIA_TYPES.includes(mediaType)
        ? mediaType
        : isText
          ? 'text'
          : 'other',
      metadata: { messageSid: req.body.MessageSid },
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    const hasMedia = numMedia > 0 && SUPPORTED_MEDIA_TYPES.includes(mediaType);
    const canProcess = isText || hasMedia;

    let reply = null;

    if (!canProcess) {
      // Tipo no soportado (video, ubicación, contacto, etc.): no pasa por Gemini.
      reply = UNSUPPORTED_TYPE_REPLY;
    } else if (conversation.status !== 'human') {
      const history = await getRecentMessages(conversation._id);

      let media = null;
      if (hasMedia) {
        try {
          media = await whatsappProvider.fetchMedia(req.body.MediaUrl0);
        } catch (error) {
          console.error('Media fetch error:', error);
          systemLogService.logError({ type: 'webhook', message: error.message, meta: { phone } });
        }
      }

      try {
        reply = await geminiAgent.runAgentTurn({ phone, messages: history, media });
      } catch (error) {
        console.error('Gemini agent error:', error);
        systemLogService.logError({ type: 'gemini', message: error.message, meta: { phone } });
        reply = FALLBACK_ERROR_REPLY;
      }
    }

    if (reply) {
      await Message.create({
        conversation: conversation._id,
        sender: 'assistant',
        message: reply,
        messageType: 'text',
      });

      await whatsappProvider.sendMessage({ to: phone, body: reply }).catch((error) => {
        console.error('WhatsApp send error:', error);
        systemLogService.logError({ type: 'whatsapp_send', message: error.message, meta: { phone } });
      });
    }

    return respondOk(res);
  } catch (error) {
    // Twilio reintenta agresivamente ante cualquier respuesta que no sea 200,
    // así que siempre se confirma la recepción aunque algo haya fallado.
    console.error('WhatsApp webhook error:', error);
    systemLogService.logError({ type: 'webhook', message: error.message });

    return respondOk(res);
  }
};

module.exports = {
  receiveWebhook,
};
