const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getMyAuctions } = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/profile', verifyToken, getProfile);     // GET  /api/users/profile
router.put('/profile', verifyToken, updateProfile);  // PUT  /api/users/profile
router.get('/my-auctions', verifyToken, getMyAuctions);  // GET  /api/users/my-auctions

module.exports = router;
