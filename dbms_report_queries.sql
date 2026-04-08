-- ─────────────────────────────────────────────────────────
-- 📊 BIDVAULT: COMPLEX DBMS REPORT QUERIES (PHASE 5)
-- Use these in your final university/course project report!
-- ─────────────────────────────────────────────────────────

-- 1. JOIN with AGGREGATION & GROUPING: Most Active Auctions
-- Shows the top 5 auctions with the highest number of bids and total activity.
SELECT 
    a.title AS Auction_Title,
    c.name AS Category,
    u.username AS Seller,
    COUNT(b.id) AS Total_Bids,
    MAX(b.amount) AS Highest_Bid
FROM auction_items a
JOIN categories c ON a.category_id = c.id
JOIN users u ON a.seller_id = u.id
LEFT JOIN bids b ON a.id = b.auction_id
GROUP BY a.id, a.title, c.name, u.username
ORDER BY Total_Bids DESC
LIMIT 5;


-- 2. NESTED SUBQUERY: Users Who Hold Active Winning Bids
-- Identifies "VIP" Bidders who are currently winning active auctions.
SELECT 
    u.username AS VIP_Bidder,
    u.email,
    win_stats.Total_Investment
FROM users u
JOIN (
    SELECT bidder_id, SUM(amount) AS Total_Investment
    FROM bids
    WHERE is_winning = TRUE
    GROUP BY bidder_id
) win_stats ON u.id = win_stats.bidder_id
ORDER BY win_stats.Total_Investment DESC;


-- 3. COMPUTED RANGES: Auction Revenue Estimation by Category
-- Shows the total projected economy of the application per category.
SELECT 
    c.name AS Category_Name,
    COUNT(a.id) AS Total_Items,
    SUM(a.current_price) AS Potential_Volume,
    AVG(a.current_price) AS Average_Item_Value
FROM categories c
LEFT JOIN auction_items a ON c.id = a.category_id
GROUP BY c.id, c.name
ORDER BY Potential_Volume DESC;


-- 4. STORED PROCEDURE: Atomic Closure Resolution
-- Ensures referential integrity while gracefully closing expired items.
DELIMITER //
CREATE PROCEDURE ResolveExpiredAuctions()
BEGIN
    UPDATE auction_items a
    LEFT JOIN bids b ON a.id = b.auction_id AND b.is_winning = TRUE
    SET 
        a.status = 'closed',
        a.winner_id = b.bidder_id
    WHERE a.status = 'active' AND a.end_time <= NOW();
END //
DELIMITER ;
