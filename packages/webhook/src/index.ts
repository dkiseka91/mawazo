/**
 * Mawazo Webhook Server — entry point.
 *
 * Express app receiving WhatsApp Cloud API and Telegram bot webhooks.
 * Raw body is captured before JSON parsing for HMAC signature verification.
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from '@mawazo/shared';
import { checkHealth } from '@mawazo/ai-engine';
import { whatsappRouter } from './routes/whatsapp';
import { telegramRouter } from './routes/telegram';
import { adminRouter }    from './routes/admin';
import { landingRouter }  from './routes/landing';

const logger = createLogger('webhook');
const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ── Production startup assertions ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const required = [
    'ANTHROPIC_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_WEBHOOK_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
    'ADMIN_SECRET',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables — refusing to start');
    process.exit(1);
  }
}

// ── Security headers ──────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(helmet());

// ── Raw body capture ──────────────────────────────────────────────────────────
// Must happen BEFORE JSON parsing. The raw Buffer is attached to req.rawBody
// and used by the HMAC signature verification middleware.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody: Buffer }).rawBody = buf;
    },
    limit: '100kb',
  })
);

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// ── Health check — probes DB and Redis ───────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const { db, redis } = await checkHealth();
    const healthy = db && redis;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'mawazo-webhook',
      timestamp: new Date().toISOString(),
      checks: { db, redis },
    });
  } catch (err) {
    res.status(503).json({ status: 'error', service: 'mawazo-webhook' });
  }
});

// ── Rate limiting for Telegram ────────────────────────────────────────────────
const telegramLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 20 req/min per IP averaged over 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// ── Landing page ──────────────────────────────────────────────────────────────
app.use('/', landingRouter);

// ── Admin dashboard ───────────────────────────────────────────────────────────
app.use('/admin', adminRouter);

// ── WhatsApp webhook ──────────────────────────────────────────────────────────
app.use('/webhook', whatsappRouter);

// ── Telegram bot ──────────────────────────────────────────────────────────────
app.use('/telegram', telegramLimiter, telegramRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'Mawazo webhook server started');
});

export default app;
