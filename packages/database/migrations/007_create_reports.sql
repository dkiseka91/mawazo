-- Migration 007: reports
-- Cached generated reports (P&L, Balance Sheet, Cash Flow).
-- data JSONB holds the full report structure for fast re-serving.

CREATE TABLE reports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  report_type   VARCHAR(50) NOT NULL
                  CHECK (report_type IN ('profit_and_loss', 'balance_sheet', 'cash_flow', 'vat_summary')),
  period_start  DATE        NOT NULL,
  period_end    DATE        NOT NULL,
  data          JSONB       NOT NULL DEFAULT '{}',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_business      ON reports (business_id);
CREATE INDEX idx_reports_type_period   ON reports (business_id, report_type, period_start, period_end);
