const Appointment = require('../models/Appointment');
const Customer = require('../models/customer');
const Service = require('../models/service');
const Employee = require('../models/Employee');
const { toClinicWallClock } = require('../utils/clinicTime');
const notificationService = require('../services/notification.service');
const { notifyAdmins } = require('../services/adminNotification.service');
const systemLogService = require('../services/systemLog.service');
const blockedDayService = require('../services/blockedDay.service');

const MAX_RANGE_APPOINTMENTS = 1000;

const hasOverlap = async ({ employeeId, startTime, endTime, excludeId }) => {
  if (!employeeId) {
    return false;
  }

  const filter = {
    employee: employeeId,
    status: { $ne: 'cancelled' },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const conflict = await Appointment.findOne(filter);

  return Boolean(conflict);
};

const findOrCreateCustomer = async (customerInput) => {
  const { phone, name, email, documentId } = customerInput;

  const existing = await Customer.findOne({ phone });

  if (existing) {
    return existing;
  }

  return Customer.create({ name, phone, email, documentId });
};

const getCalendarAppointments = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'from and to query params are required',
      });
    }

    const appointments = await Appointment.find({
      startTime: { $lt: new Date(to) },
      endTime: { $gt: new Date(from) },
    })
      .populate('customer', 'name phone email documentId')
      .populate('service', 'name price durationMinutes')
      .populate('employee', 'name')
      .sort({ startTime: 1 })
      .limit(MAX_RANGE_APPOINTMENTS);

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    return next(error);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const { customerId, customer, serviceId, employeeId, startTime, notes } =
      req.body;

    if ((!customerId && !customer) || !serviceId || !startTime) {
      return res.status(400).json({
        success: false,
        message:
          'customerId or customer, serviceId and startTime are required',
      });
    }

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    if (employeeId) {
      const employee = await Employee.findById(employeeId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
      }
    }

    const resolvedCustomer = customerId
      ? await Customer.findById(customerId)
      : await findOrCreateCustomer(customer);

    if (!resolvedCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    if (await blockedDayService.isDateBlocked(toClinicWallClock(start).date)) {
      return res.status(409).json({
        success: false,
        message: 'Ese día está bloqueado (no laborable). No se pueden agendar citas nuevas ahí.',
      });
    }

    const conflict = await hasOverlap({
      employeeId,
      startTime: start,
      endTime: end,
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'The employee already has an appointment in that time range',
      });
    }

    const appointment = await Appointment.create({
      customer: resolvedCustomer._id,
      service: service._id,
      employee: employeeId || undefined,
      startTime: start,
      endTime: end,
      notes,
    });

    await appointment.populate([
      { path: 'customer', select: 'name phone email documentId' },
      { path: 'service', select: 'name price durationMinutes' },
      { path: 'employee', select: 'name' },
    ]);

    const { date, time } = toClinicWallClock(start);

    notificationService
      .sendAppointmentConfirmation({
        to: resolvedCustomer.email,
        customerName: resolvedCustomer.name,
        serviceName: service.name,
        date,
        time,
        appointmentId: appointment._id,
      })
      .catch((error) => {
        console.error('Appointment confirmation email error:', error);
        systemLogService.logError({
          type: 'email_send',
          message: error.message,
          meta: { appointmentId: String(appointment._id) },
        });
      });

    if (req.admin.role === 'receptionist') {
      await notifyAdmins({
        type: 'appointment_created',
        message: `${req.admin.name} (recepcionista) creó una cita nueva para ${resolvedCustomer.name} el ${date} a las ${time} (${service.name}).`,
        actor: { id: req.admin._id, name: req.admin.name, email: req.admin.email, role: req.admin.role },
        appointmentId: appointment._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error) {
    return next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startTime, serviceId, employeeId, status, notes } = req.body;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    let service = null;
    if (serviceId) {
      service = await Service.findById(serviceId);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found',
        });
      }
    }

    const durationMinutes = service
      ? service.durationMinutes
      : (appointment.endTime - appointment.startTime) / 60000;

    const start = startTime ? new Date(startTime) : appointment.startTime;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Solo se bloquea si de verdad se está MOVIENDO la cita a un día distinto que
    // esté bloqueado — reagendar una cita AFECTADA por un bloqueo hacia otro día
    // (o solo cambiarle el estado/notas sin tocar la fecha) tiene que seguir
    // funcionando, es justo la acción que se le pide hacer al admin/recepcionista.
    if (startTime) {
      const newDate = toClinicWallClock(start).date;
      const originalDate = toClinicWallClock(appointment.startTime).date;

      if (newDate !== originalDate && (await blockedDayService.isDateBlocked(newDate))) {
        return res.status(409).json({
          success: false,
          message: 'Ese día está bloqueado (no laborable). No se pueden mover citas ahí.',
        });
      }
    }

    const nextEmployeeId =
      employeeId !== undefined ? employeeId : appointment.employee;

    const conflict = await hasOverlap({
      employeeId: nextEmployeeId,
      startTime: start,
      endTime: end,
      excludeId: appointment._id,
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'The employee already has an appointment in that time range',
      });
    }

    appointment.startTime = start;
    appointment.endTime = end;

    if (service) {
      appointment.service = service._id;
    }
    if (employeeId !== undefined) {
      appointment.employee = employeeId || undefined;
    }
    if (status) {
      appointment.status = status;
    }
    if (notes !== undefined) {
      appointment.notes = notes;
    }

    await appointment.save();

    await appointment.populate([
      { path: 'customer', select: 'name phone email documentId' },
      { path: 'service', select: 'name price durationMinutes' },
      { path: 'employee', select: 'name' },
    ]);

    if (req.admin.role === 'receptionist') {
      const { date, time } = toClinicWallClock(appointment.startTime);
      await notifyAdmins({
        type: 'appointment_modified',
        message: `${req.admin.name} (recepcionista) modificó la cita de ${appointment.customer?.name || 'un paciente'} — ahora es el ${date} a las ${time} (${appointment.service?.name || 'servicio'}), estado: ${appointment.status}.`,
        actor: { id: req.admin._id, name: req.admin.name, email: req.admin.email, role: req.admin.role },
        appointmentId: appointment._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment,
    });
  } catch (error) {
    return next(error);
  }
};

const getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ active: true }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    return next(error);
  }
};

const getEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find({ active: true }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    return next(error);
  }
};

const getBlockedDays = async (req, res, next) => {
  try {
    const blockedDays = await blockedDayService.listBlockedDays();

    return res.status(200).json({
      success: true,
      data: blockedDays,
    });
  } catch (error) {
    return next(error);
  }
};

const searchCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const customers = await Customer.find({
      $or: [{ name: regex }, { phone: regex }, { documentId: regex }],
    })
      .limit(10)
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCalendarAppointments,
  createAppointment,
  updateAppointment,
  getServices,
  getEmployees,
  getBlockedDays,
  searchCustomers,
  findOrCreateCustomer,
};
