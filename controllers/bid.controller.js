const db = require('../config/db');

// ─────────────────────────────────────────────
//  PLACE BID  →  POST /api/bids
//  Body: { auction_id, amount }
//  Requires login (verifyToken middleware)
// ─────────────────────────────────────────────
const placeBid = async (req, res) => {
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

        // ── 2. Fetch auction ───────────────────────
        const [auctions] = await db.query(
            'SELECT * FROM auction_items WHERE id = ?',
            [auction_id]
        );
        if (auctions.length === 0) {
            return res.status(404).json({ error: 'Auction not found.' });
        }
        const auction = auctions[0];

        // ── 3. Auction must be active ──────────────
        if (auction.status !== 'active') {
            return res.status(400).json({
                error: `Auction is "${auction.status}". Bidding not allowed.`
            });
        }

        // ── 4. Check auction hasn't expired ────────
        if (new Date() > new Date(auction.end_time)) {
            await db.query(
                "UPDATE auction_items SET status = 'closed' WHERE id = ?",
                [auction_id]
            );
            return res.status(400).json({ error: 'This auction has already ended.' });
        }

        // ── 5. Seller cannot bid on own auction ────
        if (auction.seller_id === bidder_id) {
            return res.status(403).json({ error: 'You cannot bid on your own auction.' });
        }

        // ── 6. Bid must beat current price ─────────
        if (Number(amount) <= Number(auction.current_price)) {
            return res.status(400).json({
                error: `Your bid must be higher than the current price of ₹${auction.current_price}.`
            });
        }

        // ── 7. Get previous highest bidder (for outbid notification) ──
        const [prevWinners] = await db.query(
            `SELECT b.bidder_id, u.username
       FROM bids b
       JOIN users u ON b.bidder_id = u.id
       WHERE b.auction_id = ? AND b.is_winning = TRUE
       LIMIT 1`,
            [auction_id]
        );
        const prevWinner = prevWinners[0] || null;

        // ── 8. Mark previous winning bid as not winning ────
        await db.query(
            'UPDATE bids SET is_winning = FALSE WHERE auction_id = ? AND is_winning = TRUE',
            [auction_id]
        );

        // ── 9. Insert new bid ──────────────────────
        const [result] = await db.query(
            'INSERT INTO bids (auction_id, bidder_id, amount, is_winning) VALUES (?, ?, ?, TRUE)',
            [auction_id, bidder_id, amount]
        );

        // ── 10. Update auction current price + bid count ───
        await db.query(
            'UPDATE auction_items SET current_price = ?, total_bids = total_bids + 1 WHERE id = ?',
            [amount, auction_id]
        );



        // ── 12. Check buy-now price hit ────────────
        let auctionWon = false;
        if (auction.buy_now_price && Number(amount) >= Number(auction.buy_now_price)) {
            await db.query(
                "UPDATE auction_items SET status = 'closed', winner_id = ? WHERE id = ?",
                [bidder_id, auction_id]
            );
            auctionWon = true;
        }

        // ── 13. Emit Socket.io event to all watchers ───────
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

        // ── 14. Auto-Bidder: check if any auto-bid should fire ──
        // Find someone with an active auto-bid that was outbid
        if (!auctionWon && prevWinner) {
            const [autoBids] = await db.query(
                `SELECT * FROM auto_bids 
                 WHERE auction_id = ? AND user_id = ? AND is_active = TRUE AND max_amount > ?`,
                [auction_id, prevWinner.bidder_id, amount]
            ).catch(() => [[]]); // gracefully skip if table doesn't exist yet

            if (autoBids.length > 0) {
                const ab = autoBids[0];
                const autoAmount = Math.min(Number(amount) + 1, Number(ab.max_amount));
                if (autoAmount > Number(amount)) {
                    // Fire auto-bid as a background request
                    const io = req.app.get('io');
                    setTimeout(async () => {
                        try {
                            await db.query('UPDATE bids SET is_winning = FALSE WHERE auction_id = ? AND is_winning = TRUE', [auction_id]);
                            const [autoResult] = await db.query(
                                'INSERT INTO bids (auction_id, bidder_id, amount, is_winning) VALUES (?, ?, ?, TRUE)',
                                [auction_id, prevWinner.bidder_id, autoAmount]
                            );
                            await db.query(
                                'UPDATE auction_items SET current_price = ?, total_bids = total_bids + 1 WHERE id = ?',
                                [autoAmount, auction_id]
                            );
                            if (io) {
                                io.to(`auction-${auction_id}`).emit('new-bid', {
                                    auction_id: auction_id,
                                    bid_id: autoResult.insertId,
                                    bidder_name: prevWinner.username + ' (Auto)',
                                    amount: autoAmount,
                                    new_price: autoAmount,
                                    total_bids: auction.total_bids + 2,
                                    auction_won: false,
                                    timestamp: new Date().toISOString(),
                                    is_auto: true
                                });
                            }
                        } catch (e) { /* silent fail */ }
                    }, 1500);
                }
            }
        }

        // ── 15. Send HTTP response ──────────────────
        res.status(201).json({
            message: auctionWon ? '🏆 Buy Now! You won the auction!' : 'Bid placed successfully!',
            bid_id: result.insertId,
            new_price: Number(amount),
            auction_won: auctionWon
        });

    } catch (err) {
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
