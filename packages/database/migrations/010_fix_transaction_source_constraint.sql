-- Migration 010: expand source constraint to include telegram and webapp channels
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_check
    CHECK (source IN ('whatsapp', 'telegram', 'webapp', 'momo', 'manual', 'ocr'));
