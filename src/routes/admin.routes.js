const express = require('express');

const adminController = require('../controllers/admin.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

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

module.exports = router;
