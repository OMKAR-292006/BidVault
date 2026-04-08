# BidVault: Entity-Relationship (ER) Diagram
This diagram outlines the relational integrity and schema architecture of the BidVault platform. You can copy-paste this Mermaid markdown code directly into your university submission or Markdown viewers (like GitHub).

```mermaid
erDiagram
    USERS ||--o{ AUCTION_ITEMS : "Lists"
    USERS ||--o{ BIDS : "Places"
    CATEGORIES ||--o{ AUCTION_ITEMS : "Categorizes"
    AUCTION_ITEMS ||--o{ BIDS : "Receives"

    USERS {
        int id PK
        varchar username
        varchar email
        varchar password
        enum role
        datetime created_at
    }

    CATEGORIES {
        int id PK
        varchar name
    }

    AUCTION_ITEMS {
        int id PK
        int seller_id FK
        int category_id FK
        varchar title
        varchar description
        varchar image_url
        decimal starting_price
        decimal current_price
        decimal buy_now_price
        datetime start_time
        datetime end_time
        enum status
        int winner_id FK
    }

    BIDS {
        int id PK
        int auction_id FK
        int bidder_id FK
        decimal amount
        boolean is_winning
        datetime created_at
    }
```
