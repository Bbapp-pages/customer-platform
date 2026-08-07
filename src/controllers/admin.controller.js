const Appointment = require('../models/Appointment');
const Participant = require('../models/Participant');
const Campaign = require('../models/Campaign');
const Customer = require('../models/customer');

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
    const [
      appointmentsByStatus,
      participantsByStatus,
      totalCampaigns,
      activeCampaigns,
      totalCustomers,
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
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { status } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
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
    const { status, campaign } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (campaign) {
      filter.campaign = campaign;
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

module.exports = {
  getStats,
  getAppointments,
  getParticipants,
  getCampaigns,
};
