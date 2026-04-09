-- PostgreSQL initialisation script
-- Called automatically by Docker Compose on first container start
-- Runs all migrations and seeds in order

\echo 'Running Mawazo database migrations...'

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrations
\i /docker-entrypoint-initdb.d/migrations/001_create_businesses.sql
INSERT INTO schema_migrations (filename) VALUES ('001_create_businesses.sql') ON CONFLICT DO NOTHING;

\i /docker-entrypoint-initdb.d/migrations/002_create_categories.sql
INSERT INTO schema_migrations (filename) VALUES ('002_create_categories.sql') ON CONFLICT DO NOTHING;

\i /docker-entrypoint-initdb.d/migrations/003_create_transactions.sql
INSERT INTO schema_migrations (filename) VALUES ('003_create_transactions.sql') ON CONFLICT DO NOTHING;

\i /docker-entrypoint-initdb.d/migrations/004_create_invoices.sql
INSERT INTO schema_migrations (filename) VALUES ('004_create_invoices.sql') ON CONFLICT DO NOTHING;

\i /docker-entrypoint-initdb.d/migrations/005_create_momo_connections.sql
INSERT INTO schema_migrations (filename) VALUES ('005_create_momo_connections.sql') ON CONFLICT DO NOTHING;

\i /docker-entrypoint-initdb.d/migrations/006_create_conversation_sessions.sql
INSERT INTO schema_migrations (filename) VALUES ('006_create_conversation_sessions.sql') ON CONFLICT DO NOTHING;

\i /docker-entrypoint-initdb.d/migrations/007_create_reports.sql
INSERT INTO schema_migrations (filename) VALUES ('007_create_reports.sql') ON CONFLICT DO NOTHING;

-- Seeds
\i /docker-entrypoint-initdb.d/seeds/001_default_categories.sql
INSERT INTO schema_migrations (filename) VALUES ('seed_001_default_categories.sql') ON CONFLICT DO NOTHING;

\echo 'Mawazo database initialisation complete.'
