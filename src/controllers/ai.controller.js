const geminiAgent = require('../integrations/ai/gemini-agent');

const chat = async (req, res, next) => {
  try {
    const { message, phone, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'The message field is required',
      });
    }

    const messages = [
      ...(Array.isArray(history) ? history : []),
      { sender: 'customer', message },
    ];

    const reply = await geminiAgent.runAgentTurn({
      phone: phone || 'debug',
      messages,
    });

    res.status(200).json({
      success: true,
      data: {
        message: reply,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  chat,
};
