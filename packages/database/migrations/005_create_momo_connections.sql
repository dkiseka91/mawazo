-- Migration 005: momo_connections
-- Stores a business's linked MTN MoMo or Airtel Money account.
-- access_token_encrypted: AES-256 encrypted token — never stored in plaintext.

CREATE TABLE momo_connections (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider                 VARCHAR(20) NOT NULL DEFAULT 'mtn_momo'
                             CHECK (provider IN ('mtn_momo', 'airtel_money')),
  account_number           VARCHAR(20) NOT NULL,
  last_sync_at             TIMESTAMPTZ,
  access_token_encrypted   TEXT,                    -- encrypted, never plaintext
  refresh_token_encrypted  TEXT,
  token_expires_at         TIMESTAMPTZ,
  is_active                BOOLEAN     NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, provider)
);

CREATE INDEX idx_momo_connections_business ON momo_connections (business_id);

CREATE TRIGGER momo_connections_updated_at
  BEFORE UPDATE ON momo_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
