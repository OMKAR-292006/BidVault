-- ============================================================
--  PHASE 5 — ADVANCED SQL QUERIES
--  Auction/Bidding Platform — DBMS Report Queries
--  Run these in MySQL Workbench for your DBMS submission
-- ============================================================

USE auction_db;


-- ════════════════════════════════════════════════════════════
--  SECTION 1: BASIC QUERIES (SELECT, WHERE, ORDER BY)
-- ════════════════════════════════════════════════════════════

-- Q1. All active auctions sorted by soonest ending
SELECT id, title, current_price, end_time, total_bids, status
FROM auction_items
WHERE status = 'active'
ORDER BY end_time ASC;


-- Q2. Users who registered in last 30 days
SELECT id, username, email, role, created_at
FROM users
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY created_at DESC;


-- Q3. All bids on a specific auction (change 1 to any auction id)
SELECT
  b.id         AS bid_id,
  u.username   AS bidder,
  b.amount,
  b.is_winning,
  b.created_at AS bid_time
FROM bids b
JOIN users u ON b.bidder_id = u.id
WHERE b.auction_id = 1
ORDER BY b.amount DESC;


-- Q4. Auctions ending in next 24 hours
SELECT
  id, title, current_price, total_bids, end_time,
  TIMESTAMPDIFF(MINUTE, NOW(), end_time) AS minutes_remaining
FROM auction_items
WHERE status = 'active'
  AND end_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
ORDER BY end_time ASC;


-- Q5. Search auctions by keyword
SELECT a.id, a.title, a.current_price, a.status, c.name AS category
FROM auction_items a
JOIN categories c ON a.category_id = c.id
WHERE a.title LIKE '%phone%' OR a.description LIKE '%phone%'
ORDER BY a.current_price DESC;


-- ════════════════════════════════════════════════════════════
--  SECTION 2: JOIN QUERIES (Multiple tables)
-- ════════════════════════════════════════════════════════════

-- Q6. Full auction details with seller, category, winner
SELECT
  a.id            AS auction_id,
  a.title,
  a.starting_price,
  a.current_price,
  a.status,
  a.total_bids,
  a.start_time,
  a.end_time,
  seller.username AS seller_name,
  seller.email    AS seller_email,
  c.name          AS category,
  winner.username AS winner_name
FROM auction_items a
JOIN  users      seller ON a.seller_id   = seller.id
JOIN  categories c      ON a.category_id = c.id
LEFT JOIN users  winner ON a.winner_id   = winner.id
ORDER BY a.created_at DESC;


-- Q7. Complete bid history with bidder name and auction title
SELECT
  b.id          AS bid_id,
  a.title       AS auction_title,
  u.username    AS bidder_name,
  b.amount,
  b.is_winning,
  b.created_at  AS bid_placed_at,
  a.status      AS auction_status,
  a.current_price
FROM bids b
JOIN auction_items a ON b.auction_id = a.id
JOIN users         u ON b.bidder_id  = u.id
ORDER BY b.created_at DESC;


-- Q8. All auctions with their current highest bidder
SELECT
  a.id,
  a.title,
  a.current_price AS highest_bid,
  a.total_bids,
  u.username      AS highest_bidder,
  a.end_time,
  a.status
FROM auction_items a
LEFT JOIN bids  b ON b.auction_id = a.id AND b.is_winning = TRUE
LEFT JOIN users u ON b.bidder_id  = u.id
ORDER BY a.current_price DESC;


-- Q9. Each user's bidding activity summary
SELECT
  u.id,
  u.username,
  u.email,
  COUNT(DISTINCT b.auction_id) AS auctions_bid_on,
  COUNT(b.id)                  AS total_bids_placed,
  MAX(b.amount)                AS highest_bid_ever,
  SUM(b.amount)                AS total_money_bid
FROM users u
LEFT JOIN bids b ON b.bidder_id = u.id
GROUP BY u.id, u.username, u.email
ORDER BY auctions_bid_on DESC;


-- Q10. Auctions per category with stats
SELECT
  c.name                    AS category,
  COUNT(a.id)               AS total_auctions,
  COUNT(CASE WHEN a.status = 'active' THEN 1 END)  AS active,
  COUNT(CASE WHEN a.status = 'closed' THEN 1 END)  AS closed,
  SUM(a.total_bids)         AS total_bids,
  ROUND(AVG(a.current_price), 2) AS avg_price,
  MAX(a.current_price)      AS highest_price
FROM categories c
LEFT JOIN auction_items a ON a.category_id = c.id
GROUP BY c.id, c.name
ORDER BY total_auctions DESC;


-- ════════════════════════════════════════════════════════════
--  SECTION 3: AGGREGATE QUERIES (GROUP BY, HAVING)
-- ════════════════════════════════════════════════════════════

-- Q11. Top 10 bidders leaderboard
SELECT
  u.username,
  u.full_name,
  COUNT(b.id)                  AS total_bids,
  SUM(b.amount)                AS total_bid_value,
  MAX(b.amount)                AS highest_single_bid,
  COUNT(DISTINCT b.auction_id) AS unique_auctions
FROM users u
JOIN bids b ON b.bidder_id = u.id
GROUP BY u.id, u.username, u.full_name
ORDER BY total_bids DESC
LIMIT 10;


-- Q12. Most competitive auctions (most bids)
SELECT
  a.id, a.title, a.current_price, a.total_bids, a.status,
  c.name         AS category,
  seller.username AS seller
FROM auction_items a
JOIN categories c      ON a.category_id = c.id
JOIN users      seller ON a.seller_id   = seller.id
WHERE a.total_bids > 0
ORDER BY a.total_bids DESC
LIMIT 10;


-- Q13. Average bids per auction by category (HAVING filter)
SELECT
  c.name                         AS category,
  COUNT(a.id)                    AS total_auctions,
  ROUND(AVG(a.total_bids), 1)    AS avg_bids_per_auction,
  ROUND(AVG(a.current_price), 2) AS avg_final_price
FROM categories c
JOIN auction_items a ON a.category_id = c.id
GROUP BY c.id, c.name
HAVING avg_bids_per_auction > 0
ORDER BY avg_bids_per_auction DESC;


-- Q14. Users who have both listed AND bid (dual participants)
SELECT
  u.username,
  u.email,
  COUNT(DISTINCT a.id) AS auctions_listed,
  COUNT(DISTINCT b.id) AS bids_placed
FROM users u
LEFT JOIN auction_items a ON a.seller_id = u.id
LEFT JOIN bids          b ON b.bidder_id = u.id
GROUP BY u.id, u.username, u.email
HAVING auctions_listed > 0 AND bids_placed > 0
ORDER BY auctions_listed DESC;


-- Q15. Revenue per seller (closed auctions only)
SELECT
  u.username           AS seller,
  u.email,
  COUNT(a.id)          AS auctions_closed,
  SUM(a.current_price) AS total_revenue,
  AVG(a.current_price) AS avg_sale_price,
  MAX(a.current_price) AS highest_sale
FROM users u
JOIN auction_items a ON a.seller_id = u.id
WHERE a.status = 'closed' AND a.winner_id IS NOT NULL
GROUP BY u.id, u.username, u.email
HAVING total_revenue > 0
ORDER BY total_revenue DESC;


-- ════════════════════════════════════════════════════════════
--  SECTION 4: SUBQUERIES
-- ════════════════════════════════════════════════════════════

-- Q16. Auctions priced above average current price
SELECT id, title, current_price, status, total_bids
FROM auction_items
WHERE current_price > (
  SELECT AVG(current_price) FROM auction_items WHERE status = 'active'
)
AND status = 'active'
ORDER BY current_price DESC;


-- Q17. Buyers who have NEVER placed a bid
SELECT id, username, email, role, created_at
FROM users
WHERE id NOT IN (SELECT DISTINCT bidder_id FROM bids)
  AND role = 'buyer'
ORDER BY created_at DESC;


-- Q18. Auction with most unique bidders
SELECT
  a.id, a.title, a.current_price, a.status,
  (SELECT COUNT(DISTINCT bidder_id) FROM bids WHERE auction_id = a.id) AS unique_bidders
FROM auction_items a
ORDER BY unique_bidders DESC
LIMIT 5;


-- Q19. Each user's most recent bid
SELECT
  u.username,
  b.amount      AS last_bid_amount,
  a.title       AS auction_title,
  b.created_at  AS bid_time
FROM bids b
JOIN users         u ON b.bidder_id  = u.id
JOIN auction_items a ON b.auction_id = a.id
WHERE b.created_at = (
  SELECT MAX(b2.created_at) FROM bids b2 WHERE b2.bidder_id = b.bidder_id
)
ORDER BY b.created_at DESC;


-- Q20. Detect invalid bids — seller bidding on own auction
SELECT
  b.id         AS suspicious_bid_id,
  a.title      AS auction_title,
  u.username   AS bidder,
  b.amount,
  b.created_at
FROM bids b
JOIN auction_items a ON b.auction_id = a.id
JOIN users         u ON b.bidder_id  = u.id
WHERE b.bidder_id = a.seller_id;


-- ════════════════════════════════════════════════════════════
--  SECTION 5: WINNER DETERMINATION
-- ════════════════════════════════════════════════════════════

-- Q21. Expired auctions still marked active
SELECT
  id, title, end_time, current_price, total_bids,
  TIMESTAMPDIFF(MINUTE, end_time, NOW()) AS minutes_overdue
FROM auction_items
WHERE status = 'active' AND end_time < NOW()
ORDER BY end_time ASC;


-- Q22. Close expired auctions + assign winners (TRANSACTION)
START TRANSACTION;

  UPDATE auction_items
  SET status = 'closed'
  WHERE status = 'active' AND end_time < NOW();

  UPDATE auction_items a
  JOIN (
    SELECT auction_id, bidder_id
    FROM bids
    WHERE is_winning = TRUE
  ) winning ON winning.auction_id = a.id
  SET a.winner_id = winning.bidder_id
  WHERE a.status = 'closed'
    AND a.winner_id IS NULL
    AND a.total_bids > 0;

COMMIT;


-- Q23. Winner report — who won what
SELECT
  a.id           AS auction_id,
  a.title        AS item_won,
  a.current_price AS winning_price,
  a.end_time,
  seller.username AS sold_by,
  winner.username AS won_by,
  winner.email    AS winner_email,
  a.total_bids
FROM auction_items a
JOIN users seller ON a.seller_id = seller.id
JOIN users winner ON a.winner_id = winner.id
WHERE a.status = 'closed' AND a.winner_id IS NOT NULL
ORDER BY a.end_time DESC;


-- ════════════════════════════════════════════════════════════
--  SECTION 6: CALL STORED PROCEDURE
-- ════════════════════════════════════════════════════════════

-- Safely place a bid (validates everything inside MySQL)
CALL PlaceBid(1, 3, 750.00, @result);
SELECT @result;  -- prints 'SUCCESS: Bid placed' or an error
