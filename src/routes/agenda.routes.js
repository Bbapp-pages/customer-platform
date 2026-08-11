const express = require('express');

const agendaController = require('../controllers/agenda.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/appointments', agendaController.getCalendarAppointments);
router.post('/appointments', agendaController.createAppointment);
router.patch('/appointments/:id', agendaController.updateAppointment);

router.get('/services', agendaController.getServices);
router.get('/employees', agendaController.getEmployees);
router.get('/customers', agendaController.searchCustomers);

module.exports = router;
