-- ============================================================
-- ROMEBOIS Phase 2 - Database Migrations
-- Run this in Supabase SQL Editor or via psql/pooler
-- ============================================================

-- ═══ 1. User Accounts Table ═══
CREATE TABLE IF NOT EXISTS user_accounts (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed admin: admin / admin123
-- bcrypt hash generated with bcryptjs
INSERT INTO user_accounts (username, password_hash, role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_accounts (username, password_hash, role)
VALUES ('kasir', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user')
ON CONFLICT (username) DO NOTHING;

-- ═══ 2. Purchases Table ═══
CREATE TABLE IF NOT EXISTS purchases (
  id                SERIAL PRIMARY KEY,
  item_name         TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('product', 'consumable')),
  quantity          INT NOT NULL CHECK (quantity > 0),
  unit_price        DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price       DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
  place_of_purchase TEXT NOT NULL DEFAULT '',
  is_new_item       BOOLEAN NOT NULL DEFAULT false,
  created_product_id INT REFERENCES products(id) ON DELETE SET NULL,
  purchased_by      INT REFERENCES user_accounts(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_category ON purchases(category);

-- ═══ 3. Bookings - add booking_type + notes ═══
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'potong_di_tempat'
CHECK (booking_type IN ('potong_di_tempat', 'dipanggil'));

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ═══ 4. Products - add stock_threshold ═══
ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock_threshold INT DEFAULT 5;

-- ═══ 5. Members - add notes ═══
ALTER TABLE members
ADD COLUMN IF NOT EXISTS notes TEXT;
