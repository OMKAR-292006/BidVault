const express = require('express');
const router = express.Router();
const { addToWatchlist, removeFromWatchlist, getWatchlist, checkWatchStatus } = require('../controllers/watchlist.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, getWatchlist);
router.post('/', verifyToken, addToWatchlist);
router.delete('/:auction_id', verifyToken, removeFromWatchlist);
router.get('/check/:auction_id', verifyToken, checkWatchStatus);

module.exports = router;
