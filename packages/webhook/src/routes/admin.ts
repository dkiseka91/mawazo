/**
 * Admin dashboard routes.
 *
 * GET /admin           — dashboard HTML (requires ?token= or X-Admin-Secret header)
 * GET /admin/api/stats — JSON summary stats
 * GET /admin/api/businesses — JSON paginated business list
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getPool } from '@mawazo/ai-engine';
import { createLogger } from '@mawazo/shared';

const router = Router();
const logger = createLogger('webhook:admin');

// ── Auth middleware ────────────────────────────────────────────────────────────
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = (process.env.ADMIN_SECRET ?? '').trim();
  if (!secret) {
    res.status(503).json({ error: 'Admin panel not configured (ADMIN_SECRET not set)' });
    return;
  }
  const rawToken = (req.query.token as string | undefined) ?? (req.headers['x-admin-secret'] as string | undefined) ?? '';
  const token = rawToken.trim();
  if (token !== secret) {
    if (req.path === '/' || req.path === '') {
      // Return login page for browser requests
      res.status(401).send(loginPage());
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
    return;
  }
  next();
}

router.use(adminAuth);

// ── Dashboard HTML ─────────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  const token = (_req.query.token as string) ?? '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(dashboardPage(token));
});

// ── Stats API ─────────────────────────────────────────────────────────────────
router.get('/api/stats', async (_req, res) => {
  const pool = getPool();
  try {
    const [overview, tiers, txStats, txMonth, active7d, signups30d] = await Promise.all([
      pool.query<{ total: string; onboarded: string }>(`
        SELECT
          COUNT(*)                                          AS total,
          COUNT(*) FILTER (WHERE onboarding_complete = true) AS onboarded
        FROM businesses
      `),
      pool.query<{ tier: string; count: string }>(`
        SELECT subscription_tier AS tier, COUNT(*) AS count
        FROM businesses
        GROUP BY subscription_tier
        ORDER BY CASE subscription_tier
          WHEN 'free' THEN 1 WHEN 'starter' THEN 2
          WHEN 'growth' THEN 3 WHEN 'pro' THEN 4 END
      `),
      pool.query<{ total_tx: string; total_volume: string }>(`
        SELECT COUNT(*) AS total_tx, COALESCE(SUM(amount_ugx),0) AS total_volume
        FROM transactions
      `),
      pool.query<{ month_tx: string; month_volume: string }>(`
        SELECT COUNT(*) AS month_tx, COALESCE(SUM(amount_ugx),0) AS month_volume
        FROM transactions
        WHERE transaction_date >= date_trunc('month', CURRENT_DATE)
      `),
      pool.query<{ count: string }>(`
        SELECT COUNT(DISTINCT business_id) AS count
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `),
      pool.query<{ day: string; count: string }>(`
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM businesses
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day
      `),
    ]);

    res.json({
      overview: {
        totalBusinesses: parseInt(overview.rows[0].total, 10),
        onboardedBusinesses: parseInt(overview.rows[0].onboarded, 10),
        activeUsers7d: parseInt(active7d.rows[0].count, 10),
      },
      transactions: {
        allTime: {
          count: parseInt(txStats.rows[0].total_tx, 10),
          volumeUgx: parseInt(txStats.rows[0].total_volume, 10),
        },
        thisMonth: {
          count: parseInt(txMonth.rows[0].month_tx, 10),
          volumeUgx: parseInt(txMonth.rows[0].month_volume, 10),
        },
      },
      subscriptionTiers: tiers.rows.map((r) => ({
        tier: r.tier,
        count: parseInt(r.count, 10),
      })),
      signups30d: signups30d.rows.map((r) => ({
        day: r.day,
        count: parseInt(r.count, 10),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Admin stats query failed');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Businesses list API ────────────────────────────────────────────────────────
router.get('/api/businesses', async (req, res) => {
  const pool = getPool();
  const page  = Math.max(1, parseInt((req.query.page  as string) ?? '1', 10));
  const limit = Math.min(50, parseInt((req.query.limit as string) ?? '20', 10));
  const offset = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      pool.query<{
        id: string; name: string | null; phone_number: string;
        subscription_tier: string; onboarding_complete: boolean;
        industry: string | null; created_at: string; tx_count: string; tx_volume: string;
      }>(`
        SELECT
          b.id, b.name, b.phone_number, b.subscription_tier,
          b.onboarding_complete, b.industry, b.created_at,
          COUNT(t.id)                     AS tx_count,
          COALESCE(SUM(t.amount_ugx), 0)  AS tx_volume
        FROM businesses b
        LEFT JOIN transactions t ON t.business_id = b.id
        GROUP BY b.id
        ORDER BY b.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query<{ count: string }>('SELECT COUNT(*) FROM businesses'),
    ]);

    res.json({
      businesses: rows.rows.map((r) => ({
        id: r.id,
        name: r.name,
        phoneNumber: r.phone_number,
        tier: r.subscription_tier,
        onboarded: r.onboarding_complete,
        industry: r.industry,
        createdAt: r.created_at,
        txCount: parseInt(r.tx_count, 10),
        txVolumeUgx: parseInt(r.tx_volume, 10),
      })),
      pagination: {
        page,
        limit,
        total: parseInt(total.rows[0].count, 10),
        totalPages: Math.ceil(parseInt(total.rows[0].count, 10) / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Admin businesses query failed');
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// ── HTML templates ─────────────────────────────────────────────────────────────

function loginPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mawazo Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;
  display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:40px;width:360px}
h1{font-size:1.5rem;font-weight:700;margin-bottom:8px;color:#f8fafc}
p{color:#94a3b8;margin-bottom:24px;font-size:.9rem}
input{width:100%;padding:10px 14px;background:#0f172a;border:1px solid #475569;
  border-radius:8px;color:#f8fafc;font-size:1rem;margin-bottom:16px}
input:focus{outline:none;border-color:#f59e0b}
button{width:100%;padding:11px;background:#f59e0b;color:#0f172a;font-weight:700;
  font-size:1rem;border:none;border-radius:8px;cursor:pointer}
button:hover{background:#d97706}
.logo{font-size:1.1rem;font-weight:800;color:#f59e0b;margin-bottom:24px;
  display:flex;align-items:center;gap:8px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">📒 Mawazo Admin</div>
  <h1>Sign in</h1>
  <p>Enter your admin secret to access the dashboard.</p>
  <form onsubmit="login(event)">
    <input type="password" id="token" placeholder="Admin secret" autofocus>
    <button type="submit">Access Dashboard</button>
  </form>
</div>
<script>
function login(e){
  e.preventDefault();
  const t=document.getElementById('token').value.trim();
  if(t) window.location.href='/admin?token='+encodeURIComponent(t);
}
</script>
</body>
</html>`;
}

function dashboardPage(token: string): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const safeToken = esc(token);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mawazo Admin Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
a{color:inherit;text-decoration:none}

/* Layout */
.layout{display:flex;min-height:100vh}
.sidebar{width:220px;background:#1e293b;border-right:1px solid #334155;
  padding:24px 16px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.main{flex:1;padding:32px;overflow:auto}

/* Sidebar */
.logo{font-size:1.1rem;font-weight:800;color:#f59e0b;padding:8px 12px;
  margin-bottom:16px;display:flex;align-items:center;gap:8px}
.nav-item{padding:10px 12px;border-radius:8px;color:#94a3b8;font-size:.9rem;
  font-weight:500;cursor:pointer;display:flex;align-items:center;gap:10px;transition:.15s}
.nav-item:hover,.nav-item.active{background:#334155;color:#f8fafc}
.nav-item .icon{font-size:1.1rem;width:20px;text-align:center}

/* Header */
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px}
.header h1{font-size:1.5rem;font-weight:700;color:#f8fafc}
.badge{background:#1e3a5f;color:#60a5fa;padding:4px 10px;border-radius:20px;font-size:.8rem;font-weight:600}

/* Stat cards */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:32px}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}
.card-label{font-size:.8rem;color:#94a3b8;font-weight:600;text-transform:uppercase;
  letter-spacing:.05em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.card-value{font-size:2rem;font-weight:800;color:#f8fafc;line-height:1}
.card-sub{font-size:.8rem;color:#64748b;margin-top:6px}
.card-value.amber{color:#f59e0b}
.card-value.green{color:#34d399}
.card-value.blue{color:#60a5fa}
.card-value.purple{color:#a78bfa}

/* Sections */
.section{background:#1e293b;border:1px solid #334155;border-radius:12px;
  padding:24px;margin-bottom:24px}
.section-title{font-size:1rem;font-weight:700;color:#f8fafc;margin-bottom:20px;
  display:flex;align-items:center;gap:8px}

/* Tier bars */
.tier-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.tier-label{width:80px;font-size:.85rem;color:#94a3b8;text-transform:capitalize}
.tier-bar-wrap{flex:1;background:#334155;border-radius:4px;height:8px;overflow:hidden}
.tier-bar{height:100%;border-radius:4px;transition:width .6s ease}
.tier-bar.free{background:#475569}
.tier-bar.starter{background:#3b82f6}
.tier-bar.growth{background:#f59e0b}
.tier-bar.pro{background:#8b5cf6}
.tier-count{width:40px;text-align:right;font-size:.85rem;color:#e2e8f0;font-weight:600}

/* Sparkline */
.sparkline-wrap{height:60px;display:flex;align-items:flex-end;gap:3px;margin-top:8px}
.spark-bar{background:#f59e0b33;border-radius:3px 3px 0 0;flex:1;min-width:4px;
  position:relative;cursor:default;transition:.2s}
.spark-bar:hover{background:#f59e0b88}
.spark-bar[title]:hover::after{content:attr(title);position:absolute;bottom:calc(100% + 4px);
  left:50%;transform:translateX(-50%);background:#0f172a;border:1px solid #334155;
  color:#e2e8f0;font-size:.75rem;padding:3px 7px;border-radius:4px;white-space:nowrap;z-index:10}

/* Table */
table{width:100%;border-collapse:collapse;font-size:.875rem}
th{text-align:left;padding:10px 12px;color:#64748b;font-weight:600;font-size:.8rem;
  text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #334155}
td{padding:12px;border-bottom:1px solid #1e293b;color:#e2e8f0}
tr:last-child td{border-bottom:none}
tr:hover td{background:#334155}
.pill{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700}
.pill.free{background:#1e3a2f;color:#6ee7b7}
.pill.starter{background:#1e2d4a;color:#93c5fd}
.pill.growth{background:#3d2900;color:#fbbf24}
.pill.pro{background:#2e1a5c;color:#c4b5fd}
.pill.yes{background:#1e3a2f;color:#6ee7b7}
.pill.no{background:#3a1a1a;color:#f87171}

/* Loading */
.loading{color:#475569;text-align:center;padding:60px;font-size:.95rem}
.error{color:#f87171;text-align:center;padding:40px}

/* Pagination */
.pagination{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;align-items:center}
.page-btn{padding:6px 14px;background:#1e293b;border:1px solid #334155;border-radius:6px;
  color:#e2e8f0;cursor:pointer;font-size:.85rem;transition:.15s}
.page-btn:hover:not(:disabled){background:#334155}
.page-btn:disabled{opacity:.4;cursor:default}
.page-info{font-size:.85rem;color:#64748b;padding:0 8px}

@media(max-width:700px){
  .layout{flex-direction:column}
  .sidebar{width:100%;flex-direction:row;overflow-x:auto;padding:12px}
  .logo{margin-bottom:0}
  .main{padding:16px}
  .cards{grid-template-columns:1fr 1fr}
}
</style>
</head>
<body>
<div class="layout">
  <!-- Sidebar -->
  <nav class="sidebar">
    <div class="logo">📒 Mawazo</div>
    <div class="nav-item active" onclick="showSection('overview')">
      <span class="icon">📊</span> Overview
    </div>
    <div class="nav-item" onclick="showSection('businesses')">
      <span class="icon">🏪</span> Businesses
    </div>
    <div class="nav-item" onclick="window.open('/', '_blank')">
      <span class="icon">🌐</span> Landing Page
    </div>
    <div style="flex:1"></div>
    <div class="nav-item" style="color:#ef4444" onclick="signOut()">
      <span class="icon">🚪</span> Sign Out
    </div>
  </nav>

  <!-- Main -->
  <main class="main">
    <!-- Overview Section -->
    <div id="overview-section">
      <div class="header">
        <h1>Dashboard</h1>
        <span class="badge" id="last-updated">Loading…</span>
      </div>

      <!-- Stat Cards -->
      <div class="cards" id="stat-cards">
        <div class="card"><div class="card-label">⌛ Loading</div><div class="card-value">—</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Tier breakdown -->
        <div class="section">
          <div class="section-title">🏷️ Subscription Tiers</div>
          <div id="tier-chart"><div class="loading">Loading…</div></div>
        </div>

        <!-- Signups sparkline -->
        <div class="section">
          <div class="section-title">📈 New Signups — Last 30 Days</div>
          <div id="sparkline"><div class="loading">Loading…</div></div>
        </div>
      </div>
    </div>

    <!-- Businesses Section -->
    <div id="businesses-section" style="display:none">
      <div class="header">
        <h1>Businesses</h1>
        <span class="badge" id="biz-count">—</span>
      </div>
      <div class="section">
        <div id="biz-table"><div class="loading">Loading…</div></div>
        <div class="pagination" id="biz-pagination"></div>
      </div>
    </div>
  </main>
</div>

<script>
const TOKEN = '${safeToken}';
let currentPage = 1;

function apiUrl(path) {
  return path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(TOKEN);
}

async function fetchJSON(path) {
  const r = await fetch(apiUrl(path));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function fmtUGX(n) {
  if (n >= 1e9) return 'UGX ' + (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6) return 'UGX ' + (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return 'UGX ' + (n/1e3).toFixed(0) + 'K';
  return 'UGX ' + n.toLocaleString();
}

function timeAgo(iso) {
  const d = new Date(iso), now = Date.now();
  const s = Math.floor((now - d) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

async function loadStats() {
  try {
    const d = await fetchJSON('/admin/api/stats');

    // Stat cards
    document.getElementById('stat-cards').innerHTML = \`
      <div class="card">
        <div class="card-label">🏪 Total Businesses</div>
        <div class="card-value amber">\${d.overview.totalBusinesses}</div>
        <div class="card-sub">\${d.overview.onboardedBusinesses} onboarded</div>
      </div>
      <div class="card">
        <div class="card-label">✅ Active (7 days)</div>
        <div class="card-value green">\${d.overview.activeUsers7d}</div>
        <div class="card-sub">businesses with transactions</div>
      </div>
      <div class="card">
        <div class="card-label">💸 Transactions (month)</div>
        <div class="card-value blue">\${d.transactions.thisMonth.count.toLocaleString()}</div>
        <div class="card-sub">\${fmtUGX(d.transactions.thisMonth.volumeUgx)}</div>
      </div>
      <div class="card">
        <div class="card-label">📦 All-time Volume</div>
        <div class="card-value purple">\${fmtUGX(d.transactions.allTime.volumeUgx)}</div>
        <div class="card-sub">\${d.transactions.allTime.count.toLocaleString()} transactions</div>
      </div>
    \`;

    // Tier chart
    const maxTier = Math.max(1, ...d.subscriptionTiers.map(t => t.count));
    document.getElementById('tier-chart').innerHTML =
      d.subscriptionTiers.map(t => \`
        <div class="tier-row">
          <div class="tier-label">\${t.tier}</div>
          <div class="tier-bar-wrap">
            <div class="tier-bar \${t.tier}" style="width:\${Math.round(t.count/maxTier*100)}%"></div>
          </div>
          <div class="tier-count">\${t.count}</div>
        </div>
      \`).join('') || '<div style="color:#475569">No data yet</div>';

    // Sparkline
    if (d.signups30d.length === 0) {
      document.getElementById('sparkline').innerHTML = '<div style="color:#475569;padding:20px 0">No signups in last 30 days</div>';
    } else {
      const maxV = Math.max(1, ...d.signups30d.map(s => s.count));
      const bars = d.signups30d.map(s => {
        const h = Math.max(4, Math.round(s.count / maxV * 56));
        return \`<div class="spark-bar" style="height:\${h}px" title="\${s.day}: \${s.count} signup\${s.count!==1?'s':''}"></div>\`;
      }).join('');
      document.getElementById('sparkline').innerHTML =
        \`<div class="sparkline-wrap">\${bars}</div>
         <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:.75rem;color:#475569">
           <span>\${d.signups30d[0]?.day ?? ''}</span>
           <span>Total: \${d.signups30d.reduce((a,s)=>a+s.count,0)}</span>
           <span>\${d.signups30d[d.signups30d.length-1]?.day ?? ''}</span>
         </div>\`;
    }

    document.getElementById('last-updated').textContent =
      'Updated ' + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById('stat-cards').innerHTML =
      '<div class="error">Failed to load stats: ' + e.message + '</div>';
  }
}

async function loadBusinesses(page = 1) {
  document.getElementById('biz-table').innerHTML = '<div class="loading">Loading…</div>';
  try {
    const d = await fetchJSON('/admin/api/businesses?page=' + page + '&limit=20');
    document.getElementById('biz-count').textContent = d.pagination.total + ' total';
    document.getElementById('biz-table').innerHTML = \`
      <table>
        <thead>
          <tr>
            <th>Business</th>
            <th>Phone</th>
            <th>Tier</th>
            <th>Onboarded</th>
            <th>Transactions</th>
            <th>Volume</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          \${d.businesses.map(b => \`
            <tr>
              <td><strong>\${b.name || '<em style="color:#475569">Unnamed</em>'}</strong>
                \${b.industry ? '<br><small style="color:#64748b">'+b.industry+'</small>' : ''}
              </td>
              <td style="color:#94a3b8;font-size:.82rem">\${b.phoneNumber}</td>
              <td><span class="pill \${b.tier}">\${b.tier}</span></td>
              <td><span class="pill \${b.onboarded?'yes':'no'}">\${b.onboarded?'Yes':'No'}</span></td>
              <td style="text-align:right">\${b.txCount.toLocaleString()}</td>
              <td style="text-align:right;color:#94a3b8">\${fmtUGX(b.txVolumeUgx)}</td>
              <td style="color:#64748b;font-size:.82rem">\${timeAgo(b.createdAt)}</td>
            </tr>
          \`).join('')}
        </tbody>
      </table>
    \`;
    renderPagination(d.pagination);
    currentPage = page;
  } catch (e) {
    document.getElementById('biz-table').innerHTML =
      '<div class="error">Failed to load businesses: ' + e.message + '</div>';
  }
}

function renderPagination(p) {
  if (p.totalPages <= 1) { document.getElementById('biz-pagination').innerHTML = ''; return; }
  document.getElementById('biz-pagination').innerHTML = \`
    <button class="page-btn" onclick="loadBusinesses(\${currentPage-1})"
      \${currentPage<=1?'disabled':''}>← Prev</button>
    <span class="page-info">Page \${p.page} of \${p.totalPages}</span>
    <button class="page-btn" onclick="loadBusinesses(\${currentPage+1})"
      \${currentPage>=p.totalPages?'disabled':''}>Next →</button>
  \`;
}

function showSection(name) {
  document.getElementById('overview-section').style.display = name==='overview' ? '' : 'none';
  document.getElementById('businesses-section').style.display = name==='businesses' ? '' : 'none';
  document.querySelectorAll('.nav-item').forEach((el,i) => {
    el.classList.toggle('active', (i===0&&name==='overview')||(i===1&&name==='businesses'));
  });
  if (name === 'businesses') loadBusinesses(1);
}

function signOut() {
  window.location.href = '/admin';
}

// Boot
loadStats();
setInterval(loadStats, 30000); // auto-refresh every 30s
</script>
</body>
</html>`;
}

export { router as adminRouter };
