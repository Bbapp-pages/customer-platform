const Appointment = require('../models/Appointment');
const Participant = require('../models/Participant');
const Campaign = require('../models/Campaign');
const Customer = require('../models/customer');
const SystemLog = require('../models/SystemLog');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const { contactParticipant } = require('../jobs/campaignFollowUp.job');
const systemLogService = require('../services/systemLog.service');

// Registered for populate() even though not queried directly here.
require('../models/service');
require('../models/Employee');

const parsePagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getStats = async (req, res, next) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      appointmentsByStatus,
      participantsByStatus,
      totalCampaigns,
      activeCampaigns,
      totalCustomers,
      errorsLast24h,
    ] = await Promise.all([
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Participant.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Campaign.countDocuments(),
      Campaign.countDocuments({ active: true }),
      Customer.countDocuments(),
      SystemLog.countDocuments({ createdAt: { $gte: last24h } }),
    ]);

    const toCountMap = (rows) =>
      rows.reduce((acc, row) => {
        acc[row._id] = row.count;
        return acc;
      }, {});

    return res.status(200).json({
      success: true,
      data: {
        appointments: {
          total: appointmentsByStatus.reduce(
            (sum, row) => sum + row.count,
            0
          ),
          byStatus: toCountMap(appointmentsByStatus),
        },
        participants: {
          total: participantsByStatus.reduce(
            (sum, row) => sum + row.count,
            0
          ),
          byStatus: toCountMap(participantsByStatus),
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
        },
        customers: {
          total: totalCustomers,
        },
        errors: {
          last24h: errorsLast24h,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { status, q, from, to } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (from) {
      filter.endTime = { $gt: new Date(from) };
    }
    if (to) {
      filter.startTime = { $lt: new Date(to) };
    }
    if (q && q.trim().length >= 2) {
      const regex = new RegExp(q.trim(), 'i');
      const matchingCustomers = await Customer.find({
        $or: [{ name: regex }, { phone: regex }],
      }).select('_id');

      filter.customer = { $in: matchingCustomers.map((c) => c._id) };
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('customer', 'name phone email')
        .populate('service', 'name price durationMinutes')
        .populate('employee', 'name')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getParticipants = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { status, campaign, q } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (campaign) {
      filter.campaign = campaign;
    }
    if (q && q.trim().length >= 2) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: regex }, { phone: regex }];
    }

    const [participants, total] = await Promise.all([
      Participant.find(filter)
        .populate('campaign', 'name')
        .populate('prize.service', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Participant.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: participants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find()
      .populate('services', 'name code')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    return next(error);
  }
};

const getLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { type } = req.query;

    const filter = {};
    if (type) {
      filter.type = type;
    }

    const [logs, total] = await Promise.all([
      SystemLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      SystemLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { q } = req.query;

    let customerFilter = null;
    if (q && q.trim().length >= 2) {
      const regex = new RegExp(q.trim(), 'i');
      const matchingCustomers = await Customer.find({
        $or: [{ name: regex }, { phone: regex }],
      }).select('_id');

      customerFilter = { customer: { $in: matchingCustomers.map((c) => c._id) } };
    }

    const filter = customerFilter || {};

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('customer', 'name phone')
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(filter),
    ]);

    const withPreview = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await Message.findOne({ conversation: conversation._id })
          .sort({ createdAt: -1 })
          .select('message sender messageType');

        return { ...conversation.toObject(), lastMessage };
      })
    );

    return res.status(200).json({
      success: true,
      data: withPreview,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getConversationMessages = async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id).populate('customer', 'name phone');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messages = await Message.find({ conversation: id })
      .sort({ createdAt: 1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      data: { conversation, messages },
    });
  } catch (error) {
    return next(error);
  }
};

const contactParticipantNow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const participant = await Participant.findById(id).populate('prize.service', 'name');

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    if (participant.status !== 'SELECTED' || participant.contactedAt) {
      return res.status(400).json({
        success: false,
        message: 'Este participante ya fue contactado o no está en estado SELECTED.',
      });
    }

    await contactParticipant(participant);

    return res.status(200).json({
      success: true,
      message: 'Mensaje de contacto enviado.',
      data: participant,
    });
  } catch (error) {
    systemLogService.logError({
      type: 'campaign_followup',
      message: error.message,
      meta: { participantId: req.params.id },
    });

    return res.status(502).json({
      success: false,
      message: `No se pudo enviar el mensaje: ${error.message}`,
    });
  }
};

const PARTICIPANT_STATUSES = Participant.schema.path('status').enumValues;

const updateParticipantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !PARTICIPANT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${PARTICIPANT_STATUSES.join(', ')}`,
      });
    }

    const participant = await Participant.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate('campaign', 'name')
      .populate('prize.service', 'name');

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Participant updated successfully',
      data: participant,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;

    const participant = await Participant.findById(id);

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    if (participant.appointment) {
      await Appointment.deleteOne({ _id: participant.appointment });
    }

    await Participant.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: 'Participant deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStats,
  getAppointments,
  getParticipants,
  getCampaigns,
  updateParticipantStatus,
  contactParticipantNow,
  deleteParticipant,
  getLogs,
  getConversations,
  getConversationMessages,
};
