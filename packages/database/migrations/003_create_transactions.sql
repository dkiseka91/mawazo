-- Migration 003: transactions
-- Every income and expense recorded by a business.
-- Amounts stored as BIGINT whole UGX shillings (Uganda does not use fractional currency).

CREATE TABLE transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount_ugx       BIGINT      NOT NULL CHECK (amount_ugx > 0),
  type             VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
  category_id      UUID        REFERENCES categories(id) ON DELETE SET NULL,
  description      TEXT,
  source           VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
                     CHECK (source IN ('whatsapp', 'momo', 'manual', 'ocr')),
  receipt_url      TEXT,                            -- S3/R2 URL for receipt image
  transaction_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_business_date ON transactions (business_id, transaction_date);
CREATE INDEX idx_transactions_type          ON transactions (business_id, type);
CREATE INDEX idx_transactions_category      ON transactions (category_id);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
