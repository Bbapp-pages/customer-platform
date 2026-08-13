const Appointment = require('../models/Appointment');
const Participant = require('../models/Participant');
const Campaign = require('../models/Campaign');
const Customer = require('../models/customer');
const SystemLog = require('../models/SystemLog');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const Admin = require('../models/Admin');
const AdminNotification = require('../models/AdminNotification');
const { contactParticipant } = require('../jobs/campaignFollowUp.job');
const systemLogService = require('../services/systemLog.service');
const systemSettingService = require('../services/systemSetting.service');
const customInstructionService = require('../services/customInstruction.service');
const CustomInstruction = require('../models/CustomInstruction');
const { toClinicWallClock } = require('../utils/clinicTime');
const blockedDayService = require('../services/blockedDay.service');

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const USER_ROLES = ['admin', 'receptionist'];

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

// Borra la conversación completa (y sus mensajes) de un cliente. No borra al Customer ni a un
// eventual Participant — solo el historial de chat, que es lo que Gemini usa como memoria y no
// debe sobrevivir a un cliente que ya no está en la base de datos.
const deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await Message.deleteMany({ conversation: id });
    await Conversation.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const contactParticipantNow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.body;

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

    const isEarly = participant.revealAt && participant.revealAt > new Date();

    if (isEarly && !force) {
      const { date, time } = toClinicWallClock(participant.revealAt);
      return res.status(400).json({
        success: false,
        message: `Todavía no corresponde avisarle a este participante. Se le contactará automáticamente el ${date} a las ${time} (hora de la clínica), para no delatar el resultado antes de tiempo.`,
      });
    }

    // force=true salta el horario de revelación a propósito — solo para pruebas
    // controladas de la IA (ej. probar el flujo post-CONTACTED sin esperar), no
    // para uso normal. Queda registrado en SystemLog para que quede rastro de
    // cada vez que se usó.
    if (isEarly && force) {
      systemLogService.logError({
        type: 'campaign_followup',
        message: 'Contacto manual forzado antes de revealAt (uso de prueba)',
        meta: { participantId: String(participant._id), phone: participant.phone, by: req.admin.email },
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

    const customer = await Customer.findOne({ phone: participant.phone });
    if (customer) {
      const conversations = await Conversation.find({ customer: customer._id }).select('_id');
      await Message.deleteMany({ conversation: { $in: conversations.map((c) => c._id) } });
      await Conversation.deleteMany({ customer: customer._id });
    }

    await Participant.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: 'Participant deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await Admin.find({}).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password y role son obligatorios',
      });
    }

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Admin.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta con ese correo.',
      });
    }

    const user = await Admin.create({ name, email: normalizedEmail, password, role });

    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active },
    });
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, active } = req.body;

    const user = await Admin.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (role !== undefined) {
      if (!USER_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: 'Rol inválido' });
      }
      user.role = role;
    }

    if (active !== undefined) {
      if (String(user._id) === String(req.admin._id) && !active) {
        return res.status(400).json({
          success: false,
          message: 'No puedes desactivar tu propia cuenta.',
        });
      }
      user.active = active;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active },
    });
  } catch (error) {
    return next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      AdminNotification.find({}).sort({ createdAt: -1 }).limit(50),
      AdminNotification.countDocuments({ readBy: { $ne: req.admin._id } }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    await AdminNotification.updateOne(
      { _id: req.params.id },
      { $addToSet: { readBy: req.admin._id } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await AdminNotification.updateMany(
      { readBy: { $ne: req.admin._id } },
      { $addToSet: { readBy: req.admin._id } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const getSystemStatus = async (req, res, next) => {
  try {
    const settings = await systemSettingService.getSettings();

    return res.status(200).json({ success: true, data: { aiEnabled: settings.aiEnabled } });
  } catch (error) {
    return next(error);
  }
};

const updateSystemStatus = async (req, res, next) => {
  try {
    const { aiEnabled } = req.body;

    if (typeof aiEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'aiEnabled debe ser true o false' });
    }

    const settings = await systemSettingService.setAiEnabled(aiEnabled);

    return res.status(200).json({
      success: true,
      message: aiEnabled ? 'Sistema activado' : 'Sistema apagado',
      data: { aiEnabled: settings.aiEnabled },
    });
  } catch (error) {
    return next(error);
  }
};

const getCustomInstructions = async (req, res, next) => {
  try {
    const rules = await customInstructionService.listCustomInstructions();

    return res.status(200).json({ success: true, data: rules });
  } catch (error) {
    return next(error);
  }
};

const createCustomInstruction = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'El texto de la instrucción es obligatorio' });
    }

    const rule = await CustomInstruction.create({
      text: text.trim(),
      createdBy: { id: req.admin._id, name: req.admin.name, email: req.admin.email },
    });

    return res.status(201).json({ success: true, message: 'Instrucción agregada', data: rule });
  } catch (error) {
    return next(error);
  }
};

const deleteCustomInstruction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await CustomInstruction.findById(id);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Instrucción no encontrada' });
    }

    await CustomInstruction.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: 'Instrucción eliminada' });
  } catch (error) {
    return next(error);
  }
};

const previewBlockedDay = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date || !DATE_ONLY_PATTERN.test(date)) {
      return res.status(400).json({ success: false, message: 'date debe tener formato YYYY-MM-DD' });
    }

    const alreadyBlocked = await blockedDayService.isDateBlocked(date);
    const affectedAppointments = await blockedDayService.getAffectedAppointments(date);

    return res.status(200).json({
      success: true,
      data: {
        alreadyBlocked,
        affected: affectedAppointments.map((appointment) => ({
          id: String(appointment._id),
          time: toClinicWallClock(appointment.startTime).time,
          serviceName: appointment.service?.name || 'Sin servicio',
          customerName: appointment.customer?.name || 'Sin nombre',
          customerPhone: appointment.customer?.phone || '—',
          customerEmail: appointment.customer?.email || '—',
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const createBlockedDay = async (req, res, next) => {
  try {
    const { date, reason } = req.body;

    if (!date || !DATE_ONLY_PATTERN.test(date)) {
      return res.status(400).json({ success: false, message: 'date debe tener formato YYYY-MM-DD' });
    }

    const result = await blockedDayService.blockDay({ date, reason, admin: req.admin });

    if (result.alreadyBlocked) {
      return res.status(409).json({ success: false, message: 'Ese día ya estaba bloqueado.' });
    }

    return res.status(201).json({
      success: true,
      message:
        result.affected.length > 0
          ? `Día bloqueado. Se avisó a los admins y a gerencia sobre ${result.affected.length} cita(s) que hay que reagendar.`
          : 'Día bloqueado.',
      data: { blockedDay: result.blockedDay, affected: result.affected },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Ese día ya estaba bloqueado.' });
    }
    return next(error);
  }
};

const deleteBlockedDay = async (req, res, next) => {
  try {
    const { date } = req.params;

    if (!DATE_ONLY_PATTERN.test(date)) {
      return res.status(400).json({ success: false, message: 'date debe tener formato YYYY-MM-DD' });
    }

    const result = await blockedDayService.unblockDay(date);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Ese día no estaba bloqueado.' });
    }

    return res.status(200).json({ success: true, message: 'Día desbloqueado.' });
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
  deleteConversation,
  getUsers,
  createUser,
  updateUser,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSystemStatus,
  updateSystemStatus,
  getCustomInstructions,
  createCustomInstruction,
  deleteCustomInstruction,
  previewBlockedDay,
  createBlockedDay,
  deleteBlockedDay,
};
