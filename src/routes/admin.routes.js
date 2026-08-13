const express = require('express');

const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
// Todo lo de este router es exclusivo del rol admin — la recepcionista solo
// tiene acceso a /api/agenda (ver agenda.routes.js).
router.use(restrictTo('admin'));

router.get('/stats', adminController.getStats);
router.get('/appointments', adminController.getAppointments);
router.get('/participants', adminController.getParticipants);
router.get('/campaigns', adminController.getCampaigns);
router.patch('/participants/:id', adminController.updateParticipantStatus);
router.post('/participants/:id/contact-now', adminController.contactParticipantNow);
router.delete('/participants/:id', adminController.deleteParticipant);
router.get('/logs', adminController.getLogs);
router.get('/conversations', adminController.getConversations);
router.get('/conversations/:id/messages', adminController.getConversationMessages);
router.delete('/conversations/:id', adminController.deleteConversation);

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:id', adminController.updateUser);

module.exports = router;
