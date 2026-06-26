const db = require('../config/db');

// ── Recursive auto-bid engine ─────────────────
// Fires whenever someone places a bid, checks if any auto-bid should respond.
// If two users both have auto-bids, they battle it out until one hits their max.
async function triggerAutoBid(auction_id, last_bidder_id, current_amount, current_total_bids, io, depth = 0) {
    if (depth > 20) return; // safety cap to prevent infinite loops
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Fetch latest state of auction & lock the row
        const [auctions] = await connection.query(
            'SELECT current_price, total_bids, status FROM auction_items WHERE id = ? FOR UPDATE',
            [auction_id]
        );
        if (!auctions.length || auctions[0].status !== 'active') {
            await connection.commit();
            connection.release();
            return;
        }

        const auction = auctions[0];
        const actualCurrentPrice = Number(auction.current_price);

        // 2. Fetch the best active auto bid that exceeds current price
        const [autoBids] = await connection.query(
            `SELECT ab.*, u.username 
             FROM auto_bids ab 
             JOIN users u ON ab.user_id = u.id
             WHERE ab.auction_id = ? AND ab.user_id != ? AND ab.is_active = TRUE AND ab.max_amount > ?
             ORDER BY ab.max_amount DESC, ab.id ASC LIMIT 1`,
            [auction_id, last_bidder_id, actualCurrentPrice]
        );
        if (!autoBids.length) {
            await connection.commit();
            connection.release();
            return;
        }

        const ab = autoBids[0];
        const autoAmount = Number(actualCurrentPrice) + 1;
        if (autoAmount > Number(ab.max_amount)) {
            await connection.commit();
            connection.release();
            return;
        }

        // 3. Perform atomic updates for auto bid
        await connection.query('UPDATE bids SET is_winning = FALSE WHERE auction_id = ? AND is_winning = TRUE', [auction_id]);
        const [autoResult] = await connection.query(
            'INSERT INTO bids (auction_id, bidder_id, amount, is_winning) VALUES (?, ?, ?, TRUE)',
            [auction_id, ab.user_id, autoAmount]
        );
        await connection.query(
            'UPDATE auction_items SET current_price = ?, total_bids = total_bids + 1 WHERE id = ?',
            [autoAmount, auction_id]
        );

        await connection.commit();
        connection.release();

        const newTotal = Number(auction.total_bids) + 1;
        if (io) {
            io.to(`auction-${auction_id}`).emit('new-bid', {
                auction_id,
                bid_id: autoResult.insertId,
                bidder_name: ab.username + ' 🤖',
                amount: autoAmount,
                new_price: autoAmount,
                total_bids: newTotal,
                auction_won: false,
                timestamp: new Date().toISOString(),
                is_auto: true
            });
        }

        // Wait 800ms then check if the previous auto-bid user also has an auto-bid that should respond
        setTimeout(() => {
            triggerAutoBid(auction_id, ab.user_id, autoAmount, newTotal, io, depth + 1);
        }, 800);

    } catch (e) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('triggerAutoBid error:', e.message);
    }
}

// ─────────────────────────────────────────────
//  PLACE BID  →  POST /api/bids
//  Body: { auction_id, amount }
//  Requires login (verifyToken middleware)
// ─────────────────────────────────────────────
const placeBid = async (req, res) => {
    let connection;
    try {
        const { auction_id, amount } = req.body;
        const bidder_id = req.user.id;

        // ── 1. Basic input validation ──────────────
        if (!auction_id || !amount) {
            return res.status(400).json({ error: 'auction_id and amount are required.' });
        }
        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // ── 2. Fetch and lock the auction ───────────
        const [auctions] = await connection.query(
            'SELECT * FROM auction_items WHERE id = ? FOR UPDATE',
            [auction_id]
        );
        if (auctions.length === 0) {
            await connection.commit();
            connection.release();
            return res.status(404).json({ error: 'Auction not found.' });
        }
        const auction = auctions[0];

        // ── 3. Auction must be active ──────────────
        if (auction.status !== 'active') {
            await connection.commit();
            connection.release();
            return res.status(400).json({
                error: `Auction is "${auction.status}". Bidding not allowed.`
            });
        }

        // ── 4. Check auction hasn't expired ────────
        if (new Date() > new Date(auction.end_time)) {
            await connection.query(
                "UPDATE auction_items SET status = 'closed' WHERE id = ?",
                [auction_id]
            );
            await connection.commit();
            connection.release();
            return res.status(400).json({ error: 'This auction has already ended.' });
        }

        // ── 5. Seller cannot bid on own auction ────
        if (auction.seller_id === bidder_id) {
            await connection.commit();
            connection.release();
            return res.status(403).json({ error: 'You cannot bid on your own auction.' });
        }

        // ── 6. Bid must beat current price ─────────
        if (Number(amount) <= Number(auction.current_price)) {
            await connection.commit();
            connection.release();
            return res.status(400).json({
                error: `Your bid must be higher than the current price of ₹${auction.current_price}.`
            });
        }

        // ── 7. Get previous highest bidder (for outbid notification) ──
        const [prevWinners] = await connection.query(
            `SELECT b.bidder_id, u.username
             FROM bids b
             JOIN users u ON b.bidder_id = u.id
             WHERE b.auction_id = ? AND b.is_winning = TRUE
             LIMIT 1`,
            [auction_id]
        );
        const prevWinner = prevWinners[0] || null;

        // ── 8. Mark previous winning bid as not winning ────
        await connection.query(
            'UPDATE bids SET is_winning = FALSE WHERE auction_id = ? AND is_winning = TRUE',
            [auction_id]
        );

        // ── 9. Insert new bid ──────────────────────
        const [result] = await connection.query(
            'INSERT INTO bids (auction_id, bidder_id, amount, is_winning) VALUES (?, ?, ?, TRUE)',
            [auction_id, bidder_id, amount]
        );

        // ── 10. Update auction current price + bid count ───
        await connection.query(
            'UPDATE auction_items SET current_price = ?, total_bids = total_bids + 1 WHERE id = ?',
            [amount, auction_id]
        );

        // ── 11. Persist outbid notification in DB for previous winner ──
        if (prevWinner && prevWinner.bidder_id !== bidder_id) {
            await connection.query(
                `INSERT INTO notifications (user_id, auction_id, type, message)
                 VALUES (?, ?, 'outbid', ?)`,
                [
                    prevWinner.bidder_id,
                    auction_id,
                    `You've been outbid on "${auction.title}"! New price: ₹${Number(amount).toFixed(2)}`
                ]
            );
        }

        // ── 11. Check buy-now price hit ────────────
        let auctionWon = false;
        if (auction.buy_now_price && Number(amount) >= Number(auction.buy_now_price)) {
            await connection.query(
                "UPDATE auction_items SET status = 'closed', winner_id = ? WHERE id = ?",
                [bidder_id, auction_id]
            );
            auctionWon = true;
        }

        // Commit transaction and release connection
        await connection.commit();
        connection.release();
        connection = null; // Mark as closed

        // ── 12. Emit Socket.io event to all watchers ───────
        const io = req.app.get('io');
        if (io) {
            io.to(`auction-${auction_id}`).emit('new-bid', {
                auction_id: auction_id,
                bid_id: result.insertId,
                bidder_name: req.user.username,
                amount: Number(amount),
                new_price: Number(amount),
                total_bids: auction.total_bids + 1,
                auction_won: auctionWon,
                timestamp: new Date().toISOString()
            });

            if (prevWinner && prevWinner.bidder_id !== bidder_id) {
                io.to(`auction-${auction_id}`).emit('outbid', {
                    auction_id: auction_id,
                    auction_title: auction.title,
                    new_amount: Number(amount),
                    outbid_user: prevWinner.username
                });
            }

            if (auctionWon) {
                io.to(`auction-${auction_id}`).emit('auction-closed', {
                    auction_id: auction_id,
                    winner_name: req.user.username,
                    final_price: Number(amount)
                });
            }
        }

        // ── 13. Auto-Bidder: check if ANY auto-bid should fire ──
        if (!auctionWon) {
            triggerAutoBid(auction_id, bidder_id, Number(amount), auction.total_bids + 1, req.app.get('io'));
        }

        // ── 14. Send HTTP response ──────────────────
        res.status(201).json({
            message: auctionWon ? '🏆 Buy Now! You won the auction!' : 'Bid placed successfully!',
            bid_id: result.insertId,
            new_price: Number(amount),
            auction_won: auctionWon
        });

    } catch (err) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'You already placed this exact bid amount.' });
        }
        console.error('PlaceBid error:', err);
        res.status(500).json({ error: 'Failed to place bid.' });
    }
};

// ─────────────────────────────────────────────
//  GET MY BIDS  →  GET /api/bids/mine
// ─────────────────────────────────────────────
const getMyBids = async (req, res) => {
    try {
        const [bids] = await db.query(
            `SELECT
                 b.id         AS bid_id,
                 b.amount,
                 b.is_winning,
                 b.created_at AS bid_time,
                 a.id         AS auction_id,
                 a.title      AS auction_title,
                 a.current_price,
                 a.end_time,
                 a.status     AS auction_status,
                 a.image_url
             FROM bids b
             JOIN auction_items a ON b.auction_id = a.id
             WHERE b.bidder_id = ?
             ORDER BY b.created_at DESC`,
            [req.user.id]
        );
        res.json({ count: bids.length, bids });
    } catch (err) {
        console.error('GetMyBids error:', err);
        res.status(500).json({ error: 'Failed to fetch your bids.' });
    }
};

module.exports = { placeBid, getMyBids };
