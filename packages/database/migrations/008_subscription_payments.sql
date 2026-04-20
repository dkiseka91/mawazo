-- Migration 008: subscription_payments
-- Records MTN MoMo subscription upgrade payments.
-- On SUCCESSFUL payment, business.subscription_tier is updated by the webhook.

CREATE TABLE subscription_payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tier           VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'growth', 'pro')),
  amount_ugx     INTEGER     NOT NULL,
  phone_number   VARCHAR(20) NOT NULL,
  momo_reference UUID,
  telegram_chat_id BIGINT,                -- to notify the user when payment is confirmed
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_payments_business   ON subscription_payments (business_id);
CREATE INDEX idx_sub_payments_momo_ref   ON subscription_payments (momo_reference);
CREATE INDEX idx_sub_payments_status     ON subscription_payments (status) WHERE status = 'pending';
