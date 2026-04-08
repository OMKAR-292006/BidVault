// ══════════════════════════════════════════════
//  autoClose.js — Auction Auto-Close Job
//  Runs every 60 seconds, closes expired auctions
//  and notifies winners via Socket.io
//
//  HOW TO USE:
//    require('./jobs/autoClose')(app, io);
//    Call this once from server.js after io is set up
// ══════════════════════════════════════════════

const db = require('../config/db');

module.exports = function startAutoCloseJob(io) {

    console.log('⏰ Auto-close job started (runs every 60s)');

    async function closeExpiredAuctions() {
        try {
            // ── Step 1: Find all expired active auctions ──
            const [expired] = await db.query(`
        SELECT id, title, current_price, total_bids
        FROM auction_items
        WHERE status = 'active'
          AND end_time < NOW()
      `);

            if (expired.length === 0) return; // nothing to close

            console.log(`⏰ Auto-close: Found ${expired.length} expired auction(s)`);

            for (const auction of expired) {

                // ── Step 2: Get the winning bid ──────────────
                const [winners] = await db.query(`
          SELECT b.bidder_id, u.username, u.email, b.amount
          FROM bids b
          JOIN users u ON b.bidder_id = u.id
          WHERE b.auction_id = ? AND b.is_winning = TRUE
          LIMIT 1
        `, [auction.id]);

                const winner = winners[0] || null;

                // ── Step 3: Close the auction ────────────────
                await db.query(`
          UPDATE auction_items
          SET status    = 'closed',
              winner_id = ?
          WHERE id = ?
        `, [winner ? winner.bidder_id : null, auction.id]);

                console.log(`✅ Closed auction #${auction.id}: "${auction.title}"` +
                    (winner ? ` → Winner: ${winner.username} (₹${winner.amount})` : ' → No winner (no bids)'));

                // ── Step 4: Notify all watchers via Socket.io ─
                if (io) {
                    if (winner) {
                        io.to(`auction-${auction.id}`).emit('auction-closed', {
                            auction_id: auction.id,
                            winner_name: winner.username,
                            final_price: winner.amount
                        });
                    } else {
                        io.to(`auction-${auction.id}`).emit('auction-closed', {
                            auction_id: auction.id,
                            winner_name: null,
                            final_price: 0,
                            message: 'Auction ended with no bids'
                        });
                    }
                }

                // ── Step 5: Create winner notification in DB ──
                if (winner) {
                    await db.query(`
            INSERT INTO notifications (user_id, auction_id, type, message)
            VALUES (?, ?, 'auction_won', ?)
          `, [
                        winner.bidder_id,
                        auction.id,
                        `Congratulations! You won "${auction.title}" for ₹${winner.amount}`
                    ]);
                }
            }

        } catch (err) {
            console.error('Auto-close job error:', err.message);
        }
    }

    // Run immediately on start, then every 60 seconds
    closeExpiredAuctions();
    setInterval(closeExpiredAuctions, 60 * 1000);
};
