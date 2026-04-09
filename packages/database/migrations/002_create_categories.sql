-- Migration 002: categories
-- Uganda-specific chart of accounts with hierarchical structure
-- Account codes follow the 1000–7000 range from the technical spec

CREATE TABLE categories (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(10) UNIQUE NOT NULL,     -- e.g. '6100'
  name             VARCHAR(100) NOT NULL,            -- e.g. 'Rent'
  parent_id        UUID        REFERENCES categories(id) ON DELETE SET NULL,
  account_type     VARCHAR(20) NOT NULL
                     CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  is_system_default BOOLEAN    NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE INDEX idx_categories_type   ON categories (account_type);
