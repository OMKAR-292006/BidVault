const db = require('../config/db');

// ─────────────────────────────────────────────
//  GET ALL AUCTIONS  →  GET /api/auctions
//  Supports ?status=active  ?category=1  ?search=iphone
// ─────────────────────────────────────────────
const getAllAuctions = async (req, res) => {
    try {
        const { status, category, search } = req.query;

        let query = `
      SELECT
        a.id, a.title, a.description, a.image_url,
        a.starting_price, a.current_price, a.buy_now_price,
        a.start_time, a.end_time, a.status, a.total_bids,
        u.username   AS seller_name,
        c.name       AS category_name
      FROM auction_items a
      JOIN users      u ON a.seller_id   = u.id
      JOIN categories c ON a.category_id = c.id
      WHERE 1=1
    `;
        const params = [];

        if (status) { query += ' AND a.status = ?'; params.push(status); }
        if (category) { query += ' AND a.category_id = ?'; params.push(category); }
        if (search) { query += ' AND a.title LIKE ?'; params.push(`%${search}%`); }

        query += ' ORDER BY a.created_at DESC';

        const [auctions] = await db.query(query, params);
        res.json({ count: auctions.length, auctions });

    } catch (err) {
        console.error('GetAllAuctions error:', err);
        res.status(500).json({ error: 'Failed to fetch auctions.' });
    }
};

const getAuctionById = async (req, res) => {
    try {
        const { id } = req.params;

        const [auctions] = await db.query(
            `SELECT
         a.*,
         u.username  AS seller_name,
         u.email     AS seller_email,
         c.name      AS category_name,
         w.username  AS winner_name
       FROM auction_items a
       JOIN users      u  ON a.seller_id  = u.id
       JOIN categories c  ON a.category_id = c.id
       LEFT JOIN users w  ON a.winner_id  = w.id
       WHERE a.id = ?`,
            [id]
        );

        if (auctions.length === 0) {
            return res.status(404).json({ error: 'Auction not found.' });
        }
        res.json({ auction: auctions[0] });

    } catch (err) {
        console.error('GetAuctionById error:', err);
        res.status(500).json({ error: 'Failed to fetch auction.' });
    }
};

const getAuctionBids = async (req, res) => {
    try {
        const { id } = req.params;

        const [bids] = await db.query(
            `SELECT
         b.id, b.amount, b.is_winning, b.created_at,
         u.username AS bidder_name
       FROM bids b
       JOIN users u ON b.bidder_id = u.id
       WHERE b.auction_id = ?
       ORDER BY b.amount DESC`,
            [id]
        );

        res.json({ count: bids.length, bids });
    } catch (err) {
        console.error('GetAuctionBids error:', err);
        res.status(500).json({ error: 'Failed to fetch bids.' });
    }
};

const createAuction = async (req, res) => {
    
    // Safety format ISO strictly to native MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
    const formatNativeDate = (dateInput) => {
        if (!dateInput) return null;
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return null;
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    try {
        const {
            category_id, title, description, image_url,
            starting_price, reserve_price, buy_now_price,
            start_time, end_time
        } = req.body;

        let finalImageUrl = image_url || null;
        if (req.file) {
            finalImageUrl = '/uploads/' + req.file.filename;
        }

        if (!title || !category_id || !starting_price || !start_time || !end_time) {
            return res.status(400).json({
                error: 'title, category_id, starting_price, start_time, end_time are required.'
            });
        }

        if (new Date(end_time) <= new Date(start_time)) {
            return res.status(400).json({ error: 'end_time must be after start_time.' });
        }

        const now = new Date();
        const status = new Date(start_time) <= now ? 'active' : 'upcoming';

        const [result] = await db.query(
            `INSERT INTO auction_items
         (seller_id, category_id, title, description, image_url,
          starting_price, current_price, reserve_price, buy_now_price,
          start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,           
                category_id,
                title,
                description || null,
                finalImageUrl,
                starting_price,
                starting_price,        
                reserve_price || null,
                buy_now_price || null,
                formatNativeDate(start_time),
                formatNativeDate(end_time),
                status
            ]
        );

        res.status(201).json({
            message: 'Auction created successfully!',
            auction_id: result.insertId
        });

    } catch (err) {
        console.error('CreateAuction error:', err);
        res.status(500).json({ error: 'Failed to create auction.' });
    }
};

const updateAuction = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, end_time, status } = req.body;

        let finalImageUrl = image_url || null;
        if (req.file) {
            finalImageUrl = '/uploads/' + req.file.filename;
        }

        const [auctions] = await db.query('SELECT * FROM auction_items WHERE id = ?', [id]);
        if (auctions.length === 0) return res.status(404).json({ error: 'Auction not found.' });
        
        if (auctions[0].seller_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only edit your own auctions.' });
        }

        await db.query(
            `UPDATE auction_items
       SET title       = COALESCE(?, title),
           description = COALESCE(?, description),
           image_url   = COALESCE(?, image_url),
           end_time    = COALESCE(?, end_time),
           status      = COALESCE(?, status)
       WHERE id = ?`,
            [title, description, finalImageUrl, end_time, status, id]
        );

        res.json({ message: 'Auction updated successfully!' });
    } catch (err) {
        console.error('UpdateAuction error:', err);
        res.status(500).json({ error: 'Failed to update auction.' });
    }
};

const deleteAuction = async (req, res) => {
    try {
        const { id } = req.params;
        const [auctions] = await db.query('SELECT * FROM auction_items WHERE id = ?', [id]);
        if (auctions.length === 0) return res.status(404).json({ error: 'Auction not found.' });
        
        if (auctions[0].seller_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own auctions.' });
        }

        await db.query('DELETE FROM auction_items WHERE id = ?', [id]);
        res.json({ message: 'Auction deleted successfully!' });

    } catch (err) {
        console.error('DeleteAuction error:', err);
        res.status(500).json({ error: 'Failed to delete auction.' });
    }
};

module.exports = {
    getAllAuctions,
    getAuctionById,
    getAuctionBids,
    createAuction,
    updateAuction,
    deleteAuction
};
