const express = require('express');
const router = express.Router();
const { placeBid, getMyBids } = require('../controllers/bid.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validateBid } = require('../middleware/validate.middleware');
const db = require('../config/db');

router.post('/', verifyToken, validateBid, placeBid);
router.get('/mine', verifyToken, getMyBids);

// ── Auto-Bid (Bid Buddy) ──────────────────────
router.post('/auto', verifyToken, async (req, res) => {
    try {
        const { auction_id, max_amount } = req.body;
        if (!auction_id || !max_amount) return res.status(400).json({ error: 'auction_id and max_amount required.' });

        const [auctions] = await db.query('SELECT * FROM auction_items WHERE id = ?', [auction_id]);
        if (!auctions.length) return res.status(404).json({ error: 'Auction not found.' });
        if (Number(max_amount) <= Number(auctions[0].current_price))
            return res.status(400).json({ error: 'Max amount must be higher than current price.' });

        await db.query(
            `INSERT INTO auto_bids (auction_id, user_id, max_amount, is_active)
             VALUES (?, ?, ?, TRUE)
             ON DUPLICATE KEY UPDATE max_amount = ?, is_active = TRUE`,
            [auction_id, req.user.id, max_amount, max_amount]
        );
        res.json({ message: `Bid Buddy activated! We'll auto-bid up to ₹${max_amount} for you.` });
    } catch (err) {
        console.error('AutoBid error:', err);
        res.status(500).json({ error: 'Failed to set auto-bid.' });
    }
});

router.delete('/auto/:auction_id', verifyToken, async (req, res) => {
    try {
        await db.query('UPDATE auto_bids SET is_active = FALSE WHERE auction_id = ? AND user_id = ?',
            [req.params.auction_id, req.user.id]);
        res.json({ message: 'Bid Buddy deactivated.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to deactivate auto-bid.' });
    }
});

router.get('/auto/:auction_id', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM auto_bids WHERE auction_id = ? AND user_id = ? AND is_active = TRUE',
            [req.params.auction_id, req.user.id]
        );
        res.json({ auto_bid: rows[0] || null });
    } catch (err) {
        // Gracefully handle if auto_bids table doesn't exist yet
        res.json({ auto_bid: null });
    }
});

module.exports = router;
