-- ── 1. CATEGORIES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
  reserve_price   DECIMAL(10,2) DEFAULT NULL,
  current_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  buy_now_price   DECIMAL(10,2) DEFAULT NULL,
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
  UNIQUE KEY unique_bid (auction_id, bidder_id, amount)
);

-- ── 5. WATCHLIST ──────────────────────────────────────────
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
  type        ENUM('outbid','auction_won','auction_ended','new_bid','auction_starting') NOT NULL,
  message     TEXT          NOT NULL,
  is_read     BOOLEAN       DEFAULT FALSE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (auction_id) REFERENCES auction_items(id) ON DELETE SET NULL
);

-- ── INDEXES ───────────────────────────────────────────────
CREATE INDEX idx_auction_status   ON auction_items(status);
CREATE INDEX idx_auction_end_time ON auction_items(end_time);
CREATE INDEX idx_auction_seller   ON auction_items(seller_id);
CREATE INDEX idx_bids_auction     ON bids(auction_id);
CREATE INDEX idx_bids_bidder      ON bids(bidder_id);
CREATE INDEX idx_notif_user       ON notifications(user_id);

-- ── VIEWS ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_active_auctions AS
SELECT a.id, a.title, a.current_price, a.end_time, a.total_bids, a.status,
  u.username AS seller, c.name AS category
FROM auction_items a
JOIN users u ON a.seller_id = u.id
JOIN categories c ON a.category_id = c.id
WHERE a.status = 'active';

CREATE OR REPLACE VIEW v_bid_history AS
SELECT b.id AS bid_id, b.amount, b.created_at AS bid_time, b.is_winning,
  u.username AS bidder, a.title AS auction_title, a.status AS auction_status
FROM bids b
JOIN users u ON b.bidder_id = u.id
JOIN auction_items a ON b.auction_id = a.id
ORDER BY b.created_at DESC;

CREATE OR REPLACE VIEW v_top_bidders AS
SELECT u.id, u.username, u.full_name,
  COUNT(b.id) AS total_bids_placed,
  SUM(b.amount) AS total_amount_bid,
  MAX(b.amount) AS highest_single_bid
FROM users u
JOIN bids b ON b.bidder_id = u.id
GROUP BY u.id, u.username, u.full_name
ORDER BY total_amount_bid DESC;
