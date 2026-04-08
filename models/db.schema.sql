-- ============================================================
--  AUCTION PLATFORM — DATABASE SCHEMA
--  Run this file in MySQL Workbench or via:
--    mysql -u root -p < models/db.schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS auction_db;
USE auction_db;

-- ── 1. CATEGORIES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories
INSERT INTO categories (name, description) VALUES
  ('Electronics',   'Phones, laptops, gadgets'),
  ('Vehicles',      'Cars, bikes, trucks'),
  ('Furniture',     'Home and office furniture'),
  ('Art & Antiques','Paintings, sculptures, collectibles'),
  ('Clothing',      'Apparel and accessories'),
  ('Books',         'Textbooks, novels, rare editions');


-- ── 2. USERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100),
  phone         VARCHAR(20),
  address       TEXT,
  role          ENUM('buyer','seller','admin') DEFAULT 'buyer',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- ── 3. AUCTION ITEMS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  seller_id       INT          NOT NULL,
  category_id     INT          NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  image_url       VARCHAR(500),
  starting_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  reserve_price   DECIMAL(10,2) DEFAULT NULL,  -- minimum price to sell
  current_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  buy_now_price   DECIMAL(10,2) DEFAULT NULL,  -- optional instant buy
  start_time      DATETIME     NOT NULL,
  end_time        DATETIME     NOT NULL,
  status          ENUM('upcoming','active','closed','cancelled') DEFAULT 'upcoming',
  winner_id       INT          DEFAULT NULL,
  total_bids      INT          DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (seller_id)   REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)  ON DELETE RESTRICT,
  FOREIGN KEY (winner_id)   REFERENCES users(id)       ON DELETE SET NULL
);


-- ── 4. BIDS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bids (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  auction_id  INT           NOT NULL,
  bidder_id   INT           NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  is_winning  BOOLEAN       DEFAULT FALSE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (auction_id) REFERENCES auction_items(id) ON DELETE CASCADE,
  FOREIGN KEY (bidder_id)  REFERENCES users(id)         ON DELETE CASCADE,

  -- Prevent a user from bidding twice at the same amount on the same auction
  UNIQUE KEY unique_bid (auction_id, bidder_id, amount)
);


-- ── 5. WATCHLIST ──────────────────────────────────────────
-- Users can watch/favourite auctions
CREATE TABLE IF NOT EXISTS watchlist (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  auction_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (auction_id) REFERENCES auction_items(id) ON DELETE CASCADE,

  UNIQUE KEY unique_watch (user_id, auction_id)
);


-- ── 6. NOTIFICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  auction_id  INT           DEFAULT NULL,
  type        ENUM('outbid','auction_won','auction_ended',
                   'new_bid','auction_starting') NOT NULL,
  message     TEXT          NOT NULL,
  is_read     BOOLEAN       DEFAULT FALSE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)   REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (auction_id)REFERENCES auction_items(id) ON DELETE SET NULL
);


-- ============================================================
--  USEFUL INDEXES (speeds up common queries)
-- ============================================================
CREATE INDEX idx_auction_status   ON auction_items(status);
CREATE INDEX idx_auction_end_time ON auction_items(end_time);
CREATE INDEX idx_auction_seller   ON auction_items(seller_id);
CREATE INDEX idx_bids_auction     ON bids(auction_id);
CREATE INDEX idx_bids_bidder      ON bids(bidder_id);
CREATE INDEX idx_notif_user       ON notifications(user_id);


-- ============================================================
--  USEFUL VIEWS (great for DBMS viva / report queries)
-- ============================================================

-- View: Active auctions with seller name, category, and bid count
CREATE OR REPLACE VIEW v_active_auctions AS
SELECT
  a.id,
  a.title,
  a.current_price,
  a.end_time,
  a.total_bids,
  a.status,
  u.username      AS seller,
  c.name          AS category
FROM auction_items a
JOIN users       u ON a.seller_id   = u.id
JOIN categories  c ON a.category_id = c.id
WHERE a.status = 'active';


-- View: Full bid history with bidder name and auction title
CREATE OR REPLACE VIEW v_bid_history AS
SELECT
  b.id          AS bid_id,
  b.amount,
  b.created_at  AS bid_time,
  b.is_winning,
  u.username    AS bidder,
  a.title       AS auction_title,
  a.status      AS auction_status
FROM bids          b
JOIN users         u ON b.bidder_id  = u.id
JOIN auction_items a ON b.auction_id = a.id
ORDER BY b.created_at DESC;


-- View: Leaderboard — top bidders by total amount spent
CREATE OR REPLACE VIEW v_top_bidders AS
SELECT
  u.id,
  u.username,
  u.full_name,
  COUNT(b.id)    AS total_bids_placed,
  SUM(b.amount)  AS total_amount_bid,
  MAX(b.amount)  AS highest_single_bid
FROM users u
JOIN bids  b ON b.bidder_id = u.id
GROUP BY u.id, u.username, u.full_name
ORDER BY total_amount_bid DESC;


-- ============================================================
--  STORED PROCEDURE: Place a bid safely
-- ============================================================
DELIMITER //

CREATE PROCEDURE PlaceBid(
  IN  p_auction_id INT,
  IN  p_bidder_id  INT,
  IN  p_amount     DECIMAL(10,2),
  OUT p_result     VARCHAR(100)
)
BEGIN
  DECLARE v_current_price DECIMAL(10,2);
  DECLARE v_status        VARCHAR(20);
  DECLARE v_seller_id     INT;

  -- Fetch current state
  SELECT current_price, status, seller_id
  INTO   v_current_price, v_status, v_seller_id
  FROM   auction_items
  WHERE  id = p_auction_id;

  -- Validations
  IF v_status != 'active' THEN
    SET p_result = 'ERROR: Auction is not active';

  ELSEIF p_bidder_id = v_seller_id THEN
    SET p_result = 'ERROR: Seller cannot bid on own auction';

  ELSEIF p_amount <= v_current_price THEN
    SET p_result = 'ERROR: Bid must be higher than current price';

  ELSE
    -- Mark previous winning bid as not winning
    UPDATE bids SET is_winning = FALSE
    WHERE auction_id = p_auction_id AND is_winning = TRUE;

    -- Insert new bid
    INSERT INTO bids (auction_id, bidder_id, amount, is_winning)
    VALUES (p_auction_id, p_bidder_id, p_amount, TRUE);

    -- Update auction current price and bid count
    UPDATE auction_items
    SET current_price = p_amount,
        total_bids    = total_bids + 1
    WHERE id = p_auction_id;

    SET p_result = 'SUCCESS: Bid placed';
  END IF;
END //

DELIMITER ;


-- ============================================================
--  SAMPLE DATA (for testing)
-- ============================================================

-- Password for all test users is: password123
-- bcrypt hash of 'password123' generated separately; use your auth route to register
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
  ('admin',   'admin@auction.com',  '$2a$10$placeholderHashHere1', 'Admin User',  'admin'),
  ('alice',   'alice@example.com',  '$2a$10$placeholderHashHere2', 'Alice Smith', 'seller'),
  ('bob',     'bob@example.com',    '$2a$10$placeholderHashHere3', 'Bob Jones',   'buyer');

INSERT INTO auction_items
  (seller_id, category_id, title, description, starting_price, current_price, start_time, end_time, status)
VALUES
  (2, 1, 'iPhone 14 Pro', 'Used 6 months, excellent condition', 500.00, 500.00,
   NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 'active'),
  (2, 2, 'Honda Civic 2020', 'Single owner, 30k km', 8000.00, 8000.00,
   NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'active');
