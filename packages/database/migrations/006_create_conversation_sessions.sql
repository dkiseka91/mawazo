-- Migration 006: conversation_sessions
-- Persistent record of conversation history and intent logs per business.
-- Redis holds the hot session (30-min TTL); this table provides audit trail.

CREATE TABLE conversation_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  messages      JSONB       NOT NULL DEFAULT '[]',   -- [{role, content, timestamp}]
  intent_log    JSONB       NOT NULL DEFAULT '[]',   -- [{intent, entities, timestamp}]
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE INDEX idx_sessions_business     ON conversation_sessions (business_id);
CREATE INDEX idx_sessions_last_active  ON conversation_sessions (last_active);
CREATE INDEX idx_sessions_expires      ON conversation_sessions (expires_at);
