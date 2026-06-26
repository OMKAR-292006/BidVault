const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllRead } = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, getNotifications);
router.put('/read-all', verifyToken, markAllRead);
router.put('/:id/read', verifyToken, markAsRead);

module.exports = router;
