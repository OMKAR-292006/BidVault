const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getMyAuctions, adminGetAllBids, adminGetAllUsers, adminGetAllAuctions } = require('../controllers/user.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.get('/my-auctions', verifyToken, getMyAuctions);

// ── Admin only routes ─────────────────────────
router.get('/admin/bids',     verifyToken, requireRole('admin'), adminGetAllBids);
router.get('/admin/users',    verifyToken, requireRole('admin'), adminGetAllUsers);
router.get('/admin/auctions', verifyToken, requireRole('admin'), adminGetAllAuctions);

module.exports = router;
