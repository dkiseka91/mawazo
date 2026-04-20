-- Migration 009: store onboarding step in businesses table
-- Moving it out of Redis ensures it survives cache failures and server restarts.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(30);
