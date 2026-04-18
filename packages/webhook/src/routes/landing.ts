/**
 * Landing page route.
 * GET / — serves the Mawazo marketing page
 */

import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(landingPage());
});

function landingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Mawazo — AI-powered bookkeeping for Ugandan small businesses. Track income and expenses via Telegram. No spreadsheets. No accountant needed.">
<title>Mawazo — AI Bookkeeping for Ugandan SMEs</title>
<style>
/* ── Reset & Base ─────────────────────────────────────────────────────── */
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --amber:#f59e0b; --amber-dark:#d97706; --amber-light:#fef3c7;
  --dark:#1c1917; --dark-2:#292524; --dark-3:#3c3836;
  --text:#e7e5e4; --muted:#a8a29e; --border:#44403c;
  --white:#fff; --bg:#0c0a09;
}
html{scroll-behavior:smooth}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
  background:var(--bg);color:var(--text);line-height:1.6;font-size:16px}
a{color:var(--amber);text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%}

/* ── Layout helpers ───────────────────────────────────────────────────── */
.container{max-width:1100px;margin:0 auto;padding:0 24px}
section{padding:80px 0}
.section-label{font-size:.8rem;font-weight:700;text-transform:uppercase;
  letter-spacing:.12em;color:var(--amber);margin-bottom:12px}
h2.section-title{font-size:2.2rem;font-weight:800;color:var(--white);
  line-height:1.2;margin-bottom:16px}
.section-sub{font-size:1.1rem;color:var(--muted);max-width:560px;margin:0 auto}
.text-center{text-align:center}

/* ── Nav ──────────────────────────────────────────────────────────────── */
nav{position:sticky;top:0;z-index:100;background:rgba(12,10,9,.92);
  backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;
  padding:14px 24px;max-width:1100px;margin:0 auto}
.nav-logo{font-size:1.25rem;font-weight:800;color:var(--amber);
  display:flex;align-items:center;gap:8px}
.nav-links{display:flex;align-items:center;gap:8px}
.nav-link{color:var(--muted);font-size:.9rem;padding:6px 14px;border-radius:8px;
  transition:.15s;font-weight:500}
.nav-link:hover{color:var(--white);text-decoration:none;background:var(--dark-2)}
.btn-nav{background:var(--amber);color:var(--dark);font-weight:700;
  padding:8px 20px;border-radius:8px;font-size:.9rem;transition:.15s}
.btn-nav:hover{background:var(--amber-dark);text-decoration:none}

/* ── Hero ─────────────────────────────────────────────────────────────── */
.hero{padding:100px 0 80px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-200px;right:-100px;
  width:600px;height:600px;background:radial-gradient(circle,#f59e0b18 0%,transparent 70%);
  pointer-events:none}
.hero-inner{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:var(--dark-2);
  border:1px solid var(--border);border-radius:20px;padding:6px 14px;
  font-size:.85rem;color:var(--amber);font-weight:600;margin-bottom:24px}
.hero h1{font-size:3.2rem;font-weight:900;line-height:1.1;color:var(--white);margin-bottom:20px}
.hero h1 span{color:var(--amber)}
.hero-sub{font-size:1.15rem;color:var(--muted);margin-bottom:32px;max-width:480px}
.hero-cta{display:flex;gap:12px;flex-wrap:wrap}
.btn-primary{background:var(--amber);color:var(--dark);font-weight:700;
  padding:14px 28px;border-radius:10px;font-size:1rem;transition:.15s;
  display:inline-flex;align-items:center;gap:8px}
.btn-primary:hover{background:var(--amber-dark);text-decoration:none;transform:translateY(-1px)}
.btn-secondary{background:transparent;color:var(--white);font-weight:600;
  padding:14px 28px;border-radius:10px;font-size:1rem;transition:.15s;
  border:1px solid var(--border);display:inline-flex;align-items:center;gap:8px}
.btn-secondary:hover{background:var(--dark-2);text-decoration:none}
.hero-trust{margin-top:28px;display:flex;align-items:center;gap:12px;
  font-size:.875rem;color:var(--muted)}
.trust-dot{width:6px;height:6px;border-radius:50%;background:var(--amber)}

/* Chat mockup */
.chat-mockup{background:var(--dark-2);border:1px solid var(--border);
  border-radius:20px;padding:20px;max-width:340px;margin:0 auto}
.chat-header{display:flex;align-items:center;gap:10px;margin-bottom:16px;
  padding-bottom:16px;border-bottom:1px solid var(--border)}
.chat-avatar{width:36px;height:36px;border-radius:50%;background:var(--amber);
  display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
.chat-name{font-weight:700;font-size:.95rem;color:var(--white)}
.chat-status{font-size:.75rem;color:#4ade80}
.msg{max-width:80%;margin-bottom:10px;clear:both}
.msg-text{padding:10px 14px;border-radius:14px;font-size:.88rem;line-height:1.4}
.msg.in .msg-text{background:var(--dark-3);color:var(--text);border-radius:4px 14px 14px 14px}
.msg.out{margin-left:auto}
.msg.out .msg-text{background:var(--amber);color:var(--dark);font-weight:500;
  border-radius:14px 4px 14px 14px}
.msg-time{font-size:.72rem;color:var(--muted);margin-top:4px;text-align:right}
.typing{display:flex;gap:4px;padding:10px 14px;background:var(--dark-3);
  border-radius:4px 14px 14px 14px;width:60px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--muted);
  animation:bounce 1s infinite}
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}

/* ── Features ─────────────────────────────────────────────────────────── */
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px}
.feature-card{background:var(--dark-2);border:1px solid var(--border);
  border-radius:16px;padding:28px;transition:.2s}
.feature-card:hover{border-color:var(--amber);transform:translateY(-2px)}
.feature-icon{width:48px;height:48px;border-radius:12px;background:var(--amber-light);
  display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:16px}
.feature-card h3{font-size:1.1rem;font-weight:700;color:var(--white);margin-bottom:8px}
.feature-card p{font-size:.9rem;color:var(--muted);line-height:1.6}

/* ── How it works ─────────────────────────────────────────────────────── */
.steps{background:var(--dark-2);border-radius:24px;padding:48px;
  display:grid;grid-template-columns:repeat(3,1fr);gap:32px;position:relative;margin-top:48px}
.steps::before{content:'';position:absolute;top:76px;left:calc(33.33% - 8px);
  right:calc(33.33% - 8px);height:2px;background:linear-gradient(90deg,var(--amber),transparent)}
.step{text-align:center}
.step-num{width:48px;height:48px;border-radius:50%;background:var(--amber);
  color:var(--dark);font-weight:900;font-size:1.2rem;
  display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.step h3{font-size:1rem;font-weight:700;color:var(--white);margin-bottom:8px}
.step p{font-size:.875rem;color:var(--muted)}

/* ── Pricing ──────────────────────────────────────────────────────────── */
.pricing-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:48px}
.price-card{background:var(--dark-2);border:1px solid var(--border);
  border-radius:16px;padding:28px;position:relative;transition:.2s}
.price-card.featured{border-color:var(--amber);background:var(--dark-2)}
.price-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);
  background:var(--amber);color:var(--dark);font-size:.75rem;font-weight:700;
  padding:3px 12px;border-radius:20px}
.price-tier{font-size:.8rem;font-weight:700;text-transform:uppercase;
  letter-spacing:.08em;color:var(--muted);margin-bottom:8px}
.price-amount{font-size:2rem;font-weight:900;color:var(--white);margin-bottom:4px}
.price-amount span{font-size:1rem;color:var(--muted);font-weight:400}
.price-desc{font-size:.85rem;color:var(--muted);margin-bottom:20px}
.price-features{list-style:none;margin-bottom:24px}
.price-features li{font-size:.875rem;color:var(--text);padding:6px 0;
  border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:8px}
.price-features li:last-child{border:none}
.check{color:var(--amber);flex-shrink:0;margin-top:2px}
.btn-tier{display:block;text-align:center;padding:11px;border-radius:8px;
  font-weight:700;font-size:.9rem;transition:.15s;border:1px solid var(--border);color:var(--white)}
.btn-tier:hover{text-decoration:none;background:var(--dark-3)}
.price-card.featured .btn-tier{background:var(--amber);color:var(--dark);border-color:var(--amber)}
.price-card.featured .btn-tier:hover{background:var(--amber-dark)}

/* ── Stats banner ─────────────────────────────────────────────────────── */
.stats-banner{background:var(--dark-2);border:1px solid var(--border);
  border-radius:20px;padding:48px;display:grid;grid-template-columns:repeat(4,1fr);
  gap:24px;text-align:center;margin-top:48px}
.stat-value{font-size:2.5rem;font-weight:900;color:var(--amber)}
.stat-label{font-size:.875rem;color:var(--muted);margin-top:4px}

/* ── CTA ──────────────────────────────────────────────────────────────── */
.cta-section{background:linear-gradient(135deg,var(--dark-2) 0%,var(--dark-3) 100%);
  border:1px solid var(--border);border-radius:24px;padding:64px 48px;text-align:center;margin:0 0 80px}
.cta-section h2{font-size:2.5rem;font-weight:900;color:var(--white);margin-bottom:16px}
.cta-section p{font-size:1.1rem;color:var(--muted);margin-bottom:32px}

/* ── Footer ───────────────────────────────────────────────────────────── */
footer{border-top:1px solid var(--border);padding:32px 0}
.footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.footer-copy{color:var(--muted);font-size:.85rem}
.footer-links{display:flex;gap:20px}
.footer-links a{color:var(--muted);font-size:.85rem;transition:.15s}
.footer-links a:hover{color:var(--text);text-decoration:none}

/* ── Responsive ───────────────────────────────────────────────────────── */
@media(max-width:900px){
  .hero-inner{grid-template-columns:1fr;text-align:center}
  .hero-cta{justify-content:center}
  .hero-trust{justify-content:center}
  .hero h1{font-size:2.4rem}
  .chat-mockup{max-width:300px}
  .features-grid{grid-template-columns:1fr}
  .steps{grid-template-columns:1fr;padding:32px 24px}
  .steps::before{display:none}
  .pricing-grid{grid-template-columns:1fr 1fr}
  .stats-banner{grid-template-columns:1fr 1fr}
  h2.section-title{font-size:1.8rem}
}
@media(max-width:600px){
  .pricing-grid{grid-template-columns:1fr}
  .stats-banner{grid-template-columns:1fr 1fr}
  nav .nav-link{display:none}
  .hero{padding:60px 0 48px}
  section{padding:60px 0}
}
</style>
</head>
<body>

<!-- Nav -->
<nav>
  <div class="nav-inner">
    <div class="nav-logo">📒 Mawazo</div>
    <div class="nav-links">
      <a href="#features" class="nav-link">Features</a>
      <a href="#how-it-works" class="nav-link">How it works</a>
      <a href="#pricing" class="nav-link">Pricing</a>
      <a href="#start" class="btn-nav">Start free →</a>
    </div>
  </div>
</nav>

<!-- Hero -->
<section class="hero">
  <div class="container">
    <div class="hero-inner">
      <div>
        <div class="hero-eyebrow">🇺🇬 Built for Ugandan businesses</div>
        <h1>Bookkeeping that works on <span>Telegram</span></h1>
        <p class="hero-sub">
          Just send a message — Mawazo's AI records your income and expenses,
          generates P&amp;L reports, and keeps your books in UGX. No apps, no spreadsheets.
        </p>
        <div class="hero-cta">
          <a href="#start" class="btn-primary">🚀 Start for free</a>
          <a href="#how-it-works" class="btn-secondary">See how it works</a>
        </div>
        <div class="hero-trust">
          <div class="trust-dot"></div>
          Free forever plan &nbsp;·&nbsp;
          <div class="trust-dot"></div>
          No credit card needed &nbsp;·&nbsp;
          <div class="trust-dot"></div>
          UGX native
        </div>
      </div>
      <div>
        <div class="chat-mockup">
          <div class="chat-header">
            <div class="chat-avatar">📒</div>
            <div>
              <div class="chat-name">Mawazo Bot</div>
              <div class="chat-status">● Online</div>
            </div>
          </div>
          <div class="msg out">
            <div class="msg-text">Paid rent 400,000 UGX</div>
            <div class="msg-time">2:14 PM ✓✓</div>
          </div>
          <div class="msg in">
            <div class="msg-text">✅ Recorded! Expense of UGX 400,000 for rent.<br><br>This month: expenses UGX 620,000 · income UGX 1,800,000</div>
            <div class="msg-time">2:14 PM</div>
          </div>
          <div class="msg out">
            <div class="msg-text">natumya 50000 ku fuel</div>
            <div class="msg-time">4:31 PM ✓✓</div>
          </div>
          <div class="msg in">
            <div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Features -->
<section id="features">
  <div class="container">
    <div class="text-center">
      <div class="section-label">Features</div>
      <h2 class="section-title">Everything your business needs</h2>
      <p class="section-sub">Built for Ugandan SMEs — from market vendors to salons and transport operators.</p>
    </div>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <h3>AI-powered recording</h3>
        <p>Just describe a transaction in plain English or Luganda — Mawazo extracts the amount, category, and description automatically.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Instant P&amp;L reports</h3>
        <p>Ask "show me this month's profit" and get a full income vs expense breakdown in seconds. No accountant needed.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🇺🇬</div>
        <h3>UGX native</h3>
        <p>All amounts stored in Uganda Shillings as whole numbers — no rounding errors, no currency confusion. Supports Luganda too.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <h3>Works on Telegram</h3>
        <p>No new app to install. Use the Telegram you already have. Works on any phone — even 2G connections.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Secure &amp; private</h3>
        <p>Your financial data is stored securely on encrypted servers. Only you can access your business records.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📄</div>
        <h3>Invoice tracking</h3>
        <p>Track outstanding invoices, mark payments received, and see who owes you — all through chat. (Starter plan+)</p>
      </div>
    </div>
  </div>
</section>

<!-- How it works -->
<section id="how-it-works" style="background:var(--dark-2);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div class="container">
    <div class="text-center">
      <div class="section-label">How it works</div>
      <h2 class="section-title">Up and running in 3 steps</h2>
    </div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <h3>Start a chat</h3>
        <p>Open Telegram and search for <strong style="color:var(--amber)">@mawazo_bot</strong>. Send "Hi" to begin.</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <h3>Register your business</h3>
        <p>Tell Mawazo your business name and type. Takes under 60 seconds.</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <h3>Start recording</h3>
        <p>Send any transaction: "Sold maize for 250,000" or "Paid supplier 180,000". That's it.</p>
      </div>
    </div>
  </div>
</section>

<!-- Stats -->
<section>
  <div class="container">
    <div class="stats-banner">
      <div>
        <div class="stat-value">UGX</div>
        <div class="stat-label">Native currency support</div>
      </div>
      <div>
        <div class="stat-value">&lt;3s</div>
        <div class="stat-label">Average response time</div>
      </div>
      <div>
        <div class="stat-value">2</div>
        <div class="stat-label">Languages: English + Luganda</div>
      </div>
      <div>
        <div class="stat-value">Free</div>
        <div class="stat-label">To get started</div>
      </div>
    </div>
  </div>
</section>

<!-- Pricing -->
<section id="pricing" style="background:var(--dark-2);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div class="container">
    <div class="text-center">
      <div class="section-label">Pricing</div>
      <h2 class="section-title">Simple, affordable plans</h2>
      <p class="section-sub">Start free. Upgrade as your business grows.</p>
    </div>
    <div class="pricing-grid">

      <div class="price-card">
        <div class="price-tier">Free</div>
        <div class="price-amount">UGX 0 <span>/ month</span></div>
        <div class="price-desc">Perfect for getting started</div>
        <ul class="price-features">
          <li><span class="check">✓</span> Up to 50 transactions/month</li>
          <li><span class="check">✓</span> Monthly P&amp;L report</li>
          <li><span class="check">✓</span> Telegram &amp; WhatsApp</li>
          <li><span class="check">✓</span> Luganda support</li>
        </ul>
        <a href="#start" class="btn-tier">Get started</a>
      </div>

      <div class="price-card featured">
        <div class="price-badge">Most popular</div>
        <div class="price-tier">Starter</div>
        <div class="price-amount">UGX 20K <span>/ month</span></div>
        <div class="price-desc">For active small businesses</div>
        <ul class="price-features">
          <li><span class="check">✓</span> Unlimited transactions</li>
          <li><span class="check">✓</span> Weekly &amp; monthly reports</li>
          <li><span class="check">✓</span> Invoice tracking</li>
          <li><span class="check">✓</span> CSV export</li>
          <li><span class="check">✓</span> Priority support</li>
        </ul>
        <a href="#start" class="btn-tier">Start free trial</a>
      </div>

      <div class="price-card">
        <div class="price-tier">Growth</div>
        <div class="price-amount">UGX 50K <span>/ month</span></div>
        <div class="price-desc">For growing businesses</div>
        <ul class="price-features">
          <li><span class="check">✓</span> Everything in Starter</li>
          <li><span class="check">✓</span> MTN MoMo sync</li>
          <li><span class="check">✓</span> VAT summary report</li>
          <li><span class="check">✓</span> Receipt scanning</li>
          <li><span class="check">✓</span> Multi-user access</li>
        </ul>
        <a href="#start" class="btn-tier">Get Growth</a>
      </div>

      <div class="price-card">
        <div class="price-tier">Pro</div>
        <div class="price-amount">UGX 120K <span>/ month</span></div>
        <div class="price-desc">For established businesses</div>
        <ul class="price-features">
          <li><span class="check">✓</span> Everything in Growth</li>
          <li><span class="check">✓</span> URA TIN filing exports</li>
          <li><span class="check">✓</span> Accountant portal access</li>
          <li><span class="check">✓</span> Balance sheet reports</li>
          <li><span class="check">✓</span> Dedicated support</li>
        </ul>
        <a href="#start" class="btn-tier">Get Pro</a>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section id="start">
  <div class="container">
    <div class="cta-section">
      <h2>Ready to fix your books?</h2>
      <p>Join businesses across Uganda already using Mawazo to track their money.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="https://t.me/mawazo_bot" class="btn-primary" target="_blank" rel="noopener">
          ✈️ Open in Telegram
        </a>
        <a href="#how-it-works" class="btn-secondary">Learn more</a>
      </div>
      <p style="margin-top:20px;font-size:.85rem;color:var(--muted)">
        Free forever plan · No credit card · Setup in 60 seconds
      </p>
    </div>
  </div>
</section>

<!-- Footer -->
<footer>
  <div class="container">
    <div class="footer-inner">
      <div>
        <div class="nav-logo" style="margin-bottom:6px">📒 Mawazo</div>
        <div class="footer-copy">© 2026 Mawazo. AI bookkeeping for Ugandan SMEs.</div>
      </div>
      <div class="footer-links">
        <a href="https://t.me/mawazo_bot" target="_blank" rel="noopener">Telegram Bot</a>
        <a href="#pricing">Pricing</a>
        <a href="/health">Status</a>
      </div>
    </div>
  </div>
</footer>

</body>
</html>`;
}

export { router as landingRouter };
