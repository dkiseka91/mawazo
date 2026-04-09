-- Migration 001: businesses
-- The core entity — each SME that onboards via WhatsApp

CREATE TABLE businesses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number        VARCHAR(20) UNIQUE NOT NULL,
  name                VARCHAR(255),
  type                VARCHAR(50),                  -- e.g. 'sole_trader', 'partnership', 'limited'
  industry            VARCHAR(100),                 -- e.g. 'retail', 'food', 'services'
  currency            CHAR(3)     NOT NULL DEFAULT 'UGX',
  tin_number          VARCHAR(20),                  -- Uganda Revenue Authority TIN
  onboarding_complete BOOLEAN     NOT NULL DEFAULT false,
  subscription_tier   VARCHAR(20) NOT NULL DEFAULT 'free'
                        CHECK (subscription_tier IN ('free', 'starter', 'growth', 'pro')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_businesses_phone ON businesses (phone_number);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
