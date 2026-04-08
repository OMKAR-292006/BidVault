const express = require('express');
const router = express.Router();
const { placeBid, getMyBids } = require('../controllers/bid.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validateBid } = require('../middleware/validate.middleware');

router.post('/', verifyToken, validateBid, placeBid);
router.get('/mine', verifyToken, getMyBids);

module.exports = router;
