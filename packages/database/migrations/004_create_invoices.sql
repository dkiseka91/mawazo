-- Migration 004: invoices
-- Phase 2 feature — scaffolded now for schema completeness.
-- line_items stored as JSONB array: [{ description, quantity, unit_price_ugx, total_ugx }]

CREATE TABLE invoices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number  VARCHAR(20),                      -- human-readable e.g. INV-0001
  customer_name   VARCHAR(255),
  customer_phone  VARCHAR(20),
  line_items      JSONB       NOT NULL DEFAULT '[]',
  subtotal_ugx    BIGINT      NOT NULL DEFAULT 0,
  tax_ugx         BIGINT      NOT NULL DEFAULT 0,
  total_ugx       BIGINT      NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_business        ON invoices (business_id);
CREATE INDEX idx_invoices_status          ON invoices (business_id, status);
CREATE INDEX idx_invoices_customer_phone  ON invoices (customer_phone);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
