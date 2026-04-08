# AUCTION PLATFORM — ER DIAGRAM & DBMS REPORT
# ============================================================
# CS Project Submission — Database Design Document
# ============================================================


# ════════════════════════════════════════════
#  ENTITIES AND ATTRIBUTES
# ════════════════════════════════════════════

ENTITY: users
─────────────────────────────────────────────
  PK  id            INT         Auto-increment
      username      VARCHAR(50) UNIQUE, NOT NULL
      email         VARCHAR(100)UNIQUE, NOT NULL
      password_hash VARCHAR(255)NOT NULL  (bcrypt hashed)
      full_name     VARCHAR(100)
      phone         VARCHAR(20)
      address       TEXT
      role          ENUM        buyer | seller | admin
      is_active     BOOLEAN     default TRUE
      created_at    DATETIME
      updated_at    DATETIME


ENTITY: categories
─────────────────────────────────────────────
  PK  id            INT         Auto-increment
      name          VARCHAR(100)UNIQUE, NOT NULL
      description   TEXT
      created_at    DATETIME


ENTITY: auction_items
─────────────────────────────────────────────
  PK  id              INT           Auto-increment
  FK  seller_id       INT           → users.id
  FK  category_id     INT           → categories.id
  FK  winner_id       INT           → users.id  (nullable)
      title           VARCHAR(200)  NOT NULL
      description     TEXT
      image_url       VARCHAR(500)
      starting_price  DECIMAL(10,2) NOT NULL
      reserve_price   DECIMAL(10,2) nullable
      current_price   DECIMAL(10,2) NOT NULL
      buy_now_price   DECIMAL(10,2) nullable
      start_time      DATETIME      NOT NULL
      end_time        DATETIME      NOT NULL
      status          ENUM          upcoming|active|closed|cancelled
      total_bids      INT           default 0
      created_at      DATETIME
      updated_at      DATETIME


ENTITY: bids
─────────────────────────────────────────────
  PK  id            INT           Auto-increment
  FK  auction_id    INT           → auction_items.id
  FK  bidder_id     INT           → users.id
      amount        DECIMAL(10,2) NOT NULL
      is_winning    BOOLEAN       default FALSE
      created_at    DATETIME


ENTITY: watchlist
─────────────────────────────────────────────
  PK  id            INT           Auto-increment
  FK  user_id       INT           → users.id
  FK  auction_id    INT           → auction_items.id
      created_at    DATETIME
  UQ  (user_id, auction_id)       no duplicate watches


ENTITY: notifications
─────────────────────────────────────────────
  PK  id            INT           Auto-increment
  FK  user_id       INT           → users.id
  FK  auction_id    INT           → auction_items.id (nullable)
      type          ENUM          outbid|auction_won|auction_ended|
                                  new_bid|auction_starting
      message       TEXT
      is_read       BOOLEAN
      created_at    DATETIME


# ════════════════════════════════════════════
#  RELATIONSHIPS
# ════════════════════════════════════════════

users ────< auction_items   (one user sells MANY auctions)
            via seller_id   Cardinality: 1 : N

users ────< bids            (one user places MANY bids)
            via bidder_id   Cardinality: 1 : N

auction_items ────< bids    (one auction has MANY bids)
            via auction_id  Cardinality: 1 : N

categories ────< auction_items (one category has MANY items)
            via category_id  Cardinality: 1 : N

users ────< watchlist       (one user watches MANY auctions)
auction_items ────< watchlist (one auction watched by MANY users)
            JUNCTION TABLE  Cardinality: M : N  (many-to-many)

users ────< notifications   (one user gets MANY notifications)
            Cardinality: 1 : N


# ════════════════════════════════════════════
#  ER DIAGRAM (Text representation)
#  Draw this in MySQL Workbench or draw.io
# ════════════════════════════════════════════

┌─────────────┐     sells     ┌──────────────────┐
│   USERS     │──────────────>│  AUCTION_ITEMS   │
│─────────────│  1         N  │──────────────────│
│ PK id       │               │ PK id            │
│ username    │               │ FK seller_id     │
│ email       │               │ FK category_id   │
│ password    │               │ FK winner_id     │
│ role        │               │ title            │
│ full_name   │               │ current_price    │
└──────┬──────┘               │ status           │
       │                      │ end_time         │
       │ places               └────────┬─────────┘
       │                               │
       │ 1      N             1        │ N
       │                               │
       ▼                               ▼
┌─────────────┐          ┌─────────────────────┐
│    BIDS     │          │     CATEGORIES      │
│─────────────│          │─────────────────────│
│ PK id       │          │ PK id               │
│ FK auction  │          │ name                │
│ FK bidder   │          │ description         │
│ amount      │          └─────────────────────┘
│ is_winning  │
└─────────────┘
       │
       │ notifies
       ▼
┌─────────────────────┐    ┌────────────────────┐
│   NOTIFICATIONS     │    │    WATCHLIST       │
│─────────────────────│    │────────────────────│
│ PK id               │    │ PK id              │
│ FK user_id          │    │ FK user_id         │
│ FK auction_id       │    │ FK auction_id      │
│ type                │    │ created_at         │
│ message             │    └────────────────────┘
│ is_read             │     (M:N junction table)
└─────────────────────┘


# ════════════════════════════════════════════
#  NORMALIZATION ANALYSIS
# ════════════════════════════════════════════

1NF (First Normal Form):
  ✅ All tables have a primary key
  ✅ All columns have atomic (single) values
  ✅ No repeating groups

2NF (Second Normal Form):
  ✅ All tables are in 1NF
  ✅ All non-key attributes depend on the WHOLE primary key
  ✅ No partial dependencies (all PKs are single-column)

3NF (Third Normal Form):
  ✅ All tables are in 2NF
  ✅ No transitive dependencies
  ✅ Category name is in its own table (not repeated in auction_items)
  ✅ User details are in users table (not repeated in bids)

BCNF (Boyce-Codd Normal Form):
  ✅ For every functional dependency X → Y, X is a superkey
  ✅ watchlist has composite unique key (user_id, auction_id)


# ════════════════════════════════════════════
#  INDEXES (Performance Optimization)
# ════════════════════════════════════════════

idx_auction_status    → auction_items(status)
  WHY: Most queries filter by status = 'active'

idx_auction_end_time  → auction_items(end_time)
  WHY: Auto-close job queries WHERE end_time < NOW()

idx_auction_seller    → auction_items(seller_id)
  WHY: Seller dashboard loads "my auctions"

idx_bids_auction      → bids(auction_id)
  WHY: Every bid history query filters by auction_id

idx_bids_bidder       → bids(bidder_id)
  WHY: "My bids" page filters by bidder_id

idx_notif_user        → notifications(user_id)
  WHY: Notification bell filters by user_id


# ════════════════════════════════════════════
#  CONSTRAINTS SUMMARY
# ════════════════════════════════════════════

NOT NULL constraints:
  users: username, email, password_hash
  auction_items: title, starting_price, current_price, start_time, end_time
  bids: auction_id, bidder_id, amount

UNIQUE constraints:
  users: username, email
  watchlist: (user_id, auction_id) — no duplicate watchlist entries
  bids: (auction_id, bidder_id, amount) — no duplicate exact bid

FOREIGN KEY constraints with cascade rules:
  bids.auction_id → auction_items.id  ON DELETE CASCADE
    (delete auction = delete all its bids)
  bids.bidder_id  → users.id          ON DELETE CASCADE
    (delete user = delete their bids)
  auction_items.seller_id → users.id  ON DELETE CASCADE
  auction_items.winner_id → users.id  ON DELETE SET NULL
    (delete winner user = auction stays, winner becomes null)
  auction_items.category_id → categories.id ON DELETE RESTRICT
    (cannot delete a category that has auctions)

CHECK-style constraints (enforced in application layer):
  bid.amount > auction.current_price
  auction.end_time > auction.start_time
  bidder_id ≠ seller_id (no self-bidding)


# ════════════════════════════════════════════
#  STORED PROCEDURE: PlaceBid
# ════════════════════════════════════════════

Purpose: Atomically validate and place a bid inside MySQL.
         Prevents race conditions where two bids arrive simultaneously.

Parameters:
  IN  p_auction_id  INT
  IN  p_bidder_id   INT
  IN  p_amount      DECIMAL(10,2)
  OUT p_result      VARCHAR(100)

Logic flow:
  1. SELECT current_price, status, seller_id FROM auction_items
  2. IF status != 'active'     → SET result = ERROR
  3. IF bidder = seller        → SET result = ERROR
  4. IF amount <= current_price→ SET result = ERROR
  5. UPDATE previous winning bid to is_winning = FALSE
  6. INSERT new bid with is_winning = TRUE
  7. UPDATE auction_items SET current_price = amount, total_bids++
  8. SET result = SUCCESS


# ════════════════════════════════════════════
#  VIEWS SUMMARY
# ════════════════════════════════════════════

v_active_auctions:
  Purpose: Pre-joined view of live auctions with seller + category
  Use: Homepage, auction list page — single clean SELECT

v_bid_history:
  Purpose: All bids with bidder names and auction titles
  Use: Admin panel, analytics, DBMS report demo

v_top_bidders:
  Purpose: Leaderboard ranked by total amount bid
  Use: Gamification, analytics dashboard
