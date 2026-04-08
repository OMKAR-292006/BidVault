const db = require('../config/db');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────
//  GET PROFILE  →  GET /api/users/profile
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, username, email, full_name, phone, address, role, created_at
       FROM users WHERE id = ?`,
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user: users[0] });
    } catch (err) {
        console.error('GetProfile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
};


// ─────────────────────────────────────────────
//  UPDATE PROFILE  →  PUT /api/users/profile
// ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { full_name, phone, address, password } = req.body;

        let password_hash = null;

        // If user wants to change password
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }
            password_hash = await bcrypt.hash(password, 10);
        }

        await db.query(
            `UPDATE users
       SET full_name     = COALESCE(?, full_name),
           phone         = COALESCE(?, phone),
           address       = COALESCE(?, address),
           password_hash = COALESCE(?, password_hash)
       WHERE id = ?`,
            [full_name, phone, address, password_hash, req.user.id]
        );

        res.json({ message: 'Profile updated successfully!' });

    } catch (err) {
        console.error('UpdateProfile error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
};


// ─────────────────────────────────────────────
//  GET MY AUCTIONS  →  GET /api/users/my-auctions
//  Returns all auctions the logged-in user created
// ─────────────────────────────────────────────
const getMyAuctions = async (req, res) => {
    try {
        const [auctions] = await db.query(
            `SELECT
         a.id, a.title, a.image_url,
         a.starting_price, a.current_price,
         a.start_time, a.end_time,
         a.status, a.total_bids,
         c.name AS category_name
       FROM auction_items a
       JOIN categories c ON a.category_id = c.id
       WHERE a.seller_id = ?
       ORDER BY a.created_at DESC`,
            [req.user.id]
        );

        res.json({ count: auctions.length, auctions });

    } catch (err) {
        console.error('GetMyAuctions error:', err);
        res.status(500).json({ error: 'Failed to fetch your auctions.' });
    }
};


module.exports = { getProfile, updateProfile, getMyAuctions };
