const db = require('../config/db');

// Add item to watchlist
const addToWatchlist = async (req, res) => {
    try {
        const { auction_id } = req.body;
        const user_id = req.user.id;

        if (!auction_id) {
            return res.status(400).json({ error: 'auction_id is required.' });
        }

        // Verify auction exists
        const [auctions] = await db.query('SELECT id FROM auction_items WHERE id = ?', [auction_id]);
        if (auctions.length === 0) {
            return res.status(404).json({ error: 'Auction not found.' });
        }

        await db.query(
            `INSERT INTO watchlist (user_id, auction_id) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
            [user_id, auction_id]
        );

        res.status(201).json({ message: 'Added to watchlist successfully!' });
    } catch (err) {
        console.error('addToWatchlist error:', err);
        res.status(500).json({ error: 'Failed to add item to watchlist.' });
    }
};

// Remove item from watchlist
const removeFromWatchlist = async (req, res) => {
    try {
        const { auction_id } = req.params;
        const user_id = req.user.id;

        await db.query(
            'DELETE FROM watchlist WHERE user_id = ? AND auction_id = ?',
            [user_id, auction_id]
        );

        res.json({ message: 'Removed from watchlist successfully!' });
    } catch (err) {
        console.error('removeFromWatchlist error:', err);
        res.status(500).json({ error: 'Failed to remove item from watchlist.' });
    }
};

// Get current user's watchlist
const getWatchlist = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [items] = await db.query(
            `SELECT w.id AS watchlist_id, w.created_at AS watched_at,
                    a.id, a.title, a.starting_price, a.current_price,
                    a.end_time, a.status, a.image_url, a.total_bids,
                    c.name AS category_name
             FROM watchlist w
             JOIN auction_items a ON w.auction_id = a.id
             JOIN categories c ON a.category_id = c.id
             WHERE w.user_id = ?
             ORDER BY w.created_at DESC`,
            [user_id]
        );

        res.json({ count: items.length, watchlist: items });
    } catch (err) {
        console.error('getWatchlist error:', err);
        res.status(500).json({ error: 'Failed to retrieve watchlist.' });
    }
};

// Check if specific auction is watched by user
const checkWatchStatus = async (req, res) => {
    try {
        const { auction_id } = req.params;
        const user_id = req.user.id;

        const [rows] = await db.query(
            'SELECT 1 FROM watchlist WHERE user_id = ? AND auction_id = ?',
            [user_id, auction_id]
        );

        res.json({ is_watching: rows.length > 0 });
    } catch (err) {
        console.error('checkWatchStatus error:', err);
        res.status(500).json({ error: 'Failed to check watchlist status.' });
    }
};

module.exports = {
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    checkWatchStatus
};
