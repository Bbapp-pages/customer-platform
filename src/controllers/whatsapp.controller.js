const env = require('../config/env');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const { findOrCreateCustomer } = require('./agenda.controller');
const geminiAgent = require('../integrations/ai/gemini-agent');
const whatsappProvider = require('../integrations/whatsapp/whatsapp-cloud.provider');

const SUPPORTED_MEDIA_TYPES = ['image', 'audio', 'document'];
const HISTORY_LIMIT = 20;

const UNSUPPORTED_TYPE_REPLY =
  'Por ahora solo puedo leer mensajes de texto. ¿Puedes escribirme lo que necesitas?';
const FALLBACK_ERROR_REPLY =
  'Estamos teniendo un problema técnico. Un asesor te va a contactar pronto.';

const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.whatsappVerifyToken) {
    console.log('✓ WhatsApp webhook verified');

    return res.status(200).send(challenge);
  }

  console.error('✗ WhatsApp webhook verification failed');

  return res.sendStatus(403);
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
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) {
      // Callbacks de estado (statuses) u otros eventos que no traen un mensaje.
      return res.sendStatus(200);
    }

    const phone = message.from;
    const contactName = value.contacts?.[0]?.profile?.name || phone;

    const customer = await findOrCreateCustomer({ phone, name: contactName });
    const conversation = await findOrCreateActiveConversation(customer._id);

    const isText = message.type === 'text';

    await Message.create({
      conversation: conversation._id,
      sender: 'customer',
      message: isText ? message.text.body : `[${message.type}]`,
      messageType: SUPPORTED_MEDIA_TYPES.includes(message.type)
        ? message.type
        : isText
          ? 'text'
          : 'other',
      metadata: { wamid: message.id },
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    let reply = null;

    if (!isText) {
      // No inventamos que entendimos el contenido: no pasa por Gemini.
      reply = UNSUPPORTED_TYPE_REPLY;
    } else if (conversation.status !== 'human') {
      const history = await getRecentMessages(conversation._id);

      try {
        reply = await geminiAgent.runAgentTurn({ phone, messages: history });
      } catch (error) {
        console.error('Gemini agent error:', error);
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
      });
    }

    return res.sendStatus(200);
  } catch (error) {
    // Meta reintenta agresivamente ante cualquier respuesta que no sea 200,
    // así que siempre se confirma la recepción aunque algo haya fallado.
    console.error('WhatsApp webhook error:', error);

    return res.sendStatus(200);
  }
};

module.exports = {
  verifyWebhook,
  receiveWebhook,
};
