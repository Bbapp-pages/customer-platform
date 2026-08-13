const express = require('express');

const agendaController = require('../controllers/agenda.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
// La recepcionista puede ver la agenda y modificar una cita existente (por
// ejemplo cuando el paciente ya está en la clínica), pero no crear citas
// nuevas ni tocar nada fuera de este router.
router.use(restrictTo('admin', 'receptionist'));

router.get('/appointments', agendaController.getCalendarAppointments);
router.post('/appointments', restrictTo('admin'), agendaController.createAppointment);
router.patch('/appointments/:id', agendaController.updateAppointment);

router.get('/services', agendaController.getServices);
router.get('/employees', agendaController.getEmployees);
router.get('/customers', agendaController.searchCustomers);

module.exports = router;
