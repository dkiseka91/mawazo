-- Seed 001: Uganda-specific chart of accounts
-- All system defaults — is_system_default = true
-- Account code ranges per technical spec:
--   1000s: Assets   2000s: Liabilities   3000s: Equity
--   4000s: Income   5000s: COGS          6000s: Operating Expenses   7000s: Tax

INSERT INTO categories (code, name, parent_id, account_type, is_system_default) VALUES

-- ── ASSETS (1000s) ────────────────────────────────────────────────────────────
('1000', 'Assets',                    NULL,   'asset',     true),
('1100', 'Cash on Hand',              NULL,   'asset',     true),
('1200', 'Mobile Money Balance',      NULL,   'asset',     true),
('1210', 'MTN MoMo Balance',          NULL,   'asset',     true),
('1220', 'Airtel Money Balance',      NULL,   'asset',     true),
('1300', 'Accounts Receivable',       NULL,   'asset',     true),
('1400', 'Stock / Inventory',         NULL,   'asset',     true),
('1500', 'Equipment & Tools',         NULL,   'asset',     true),

-- ── LIABILITIES (2000s) ───────────────────────────────────────────────────────
('2000', 'Liabilities',               NULL,   'liability', true),
('2100', 'Accounts Payable',          NULL,   'liability', true),
('2200', 'NSSF Payable',              NULL,   'liability', true),
('2300', 'PAYE Payable',              NULL,   'liability', true),
('2400', 'VAT Payable',               NULL,   'liability', true),
('2500', 'Loans Payable',             NULL,   'liability', true),

-- ── EQUITY (3000s) ────────────────────────────────────────────────────────────
('3000', 'Equity',                    NULL,   'equity',    true),
('3100', 'Owner''s Capital',          NULL,   'equity',    true),
('3200', 'Retained Earnings',         NULL,   'equity',    true),
('3300', 'Owner''s Drawings',         NULL,   'equity',    true),

-- ── INCOME (4000s) ────────────────────────────────────────────────────────────
('4000', 'Income',                    NULL,   'income',    true),
('4100', 'Sales Revenue',             NULL,   'income',    true),
('4200', 'Service Revenue',           NULL,   'income',    true),
('4300', 'Rental Income',             NULL,   'income',    true),
('4900', 'Other Income',              NULL,   'income',    true),

-- ── COST OF GOODS SOLD (5000s) ────────────────────────────────────────────────
('5000', 'Cost of Goods Sold',        NULL,   'expense',   true),
('5100', 'Raw Materials',             NULL,   'expense',   true),
('5200', 'Stock Purchases',           NULL,   'expense',   true),
('5300', 'Import Costs',              NULL,   'expense',   true),
('5400', 'Freight & Delivery',        NULL,   'expense',   true),

-- ── OPERATING EXPENSES (6000s) ────────────────────────────────────────────────
('6000', 'Operating Expenses',        NULL,   'expense',   true),
('6100', 'Rent',                      NULL,   'expense',   true),
('6200', 'Salaries & Wages',          NULL,   'expense',   true),
('6300', 'Transport',                 NULL,   'expense',   true),
('6400', 'Airtime & Data',            NULL,   'expense',   true),
('6500', 'Marketing & Advertising',   NULL,   'expense',   true),
('6600', 'Repairs & Maintenance',     NULL,   'expense',   true),
('6700', 'Utilities',                 NULL,   'expense',   true),
('6800', 'Mobile Money Fees',         NULL,   'expense',   true),
('6900', 'Other Expenses',            NULL,   'expense',   true),

-- ── TAX EXPENSES (7000s) ──────────────────────────────────────────────────────
('7000', 'Tax Expenses',              NULL,   'expense',   true),
('7100', 'Income Tax',                NULL,   'expense',   true),
('7200', 'Local Service Tax',         NULL,   'expense',   true),
('7300', 'VAT (Net)',                 NULL,   'expense',   true);

-- Set parent_id relationships (cannot reference by UUID during insert, use UPDATE)
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '1000')
  WHERE code IN ('1100','1200','1300','1400','1500');

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '1200')
  WHERE code IN ('1210','1220');

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '2000')
  WHERE code IN ('2100','2200','2300','2400','2500');

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '3000')
  WHERE code IN ('3100','3200','3300');

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '4000')
  WHERE code IN ('4100','4200','4300','4900');

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '5000')
  WHERE code IN ('5100','5200','5300','5400');

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '6000')
  WHERE code IN ('6100','6200','6300','6400','6500','6600','6700','6800','6900');

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE code = '7000')
  WHERE code IN ('7100','7200','7300');
