/**
 * Mawazo Webhook Server — entry point.
 *
 * Express app receiving WhatsApp Cloud API webhooks.
 * Raw body is captured before JSON parsing for HMAC signature verification.
 */

import 'dotenv/config';
import express from 'express';
import { createLogger } from '@mawazo/shared';
import { whatsappRouter } from './routes/whatsapp';

const logger = createLogger('webhook');
const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ── Raw body capture ──────────────────────────────────────────────────────────
// Must happen BEFORE JSON parsing. The raw Buffer is attached to req.rawBody
// and used by the signature verification middleware.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody: Buffer }).rawBody = buf;
    },
    limit: '5mb',  // accommodate large receipt images in future
  })
);

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mawazo-webhook', timestamp: new Date().toISOString() });
});

// ── WhatsApp webhook ──────────────────────────────────────────────────────────
app.use('/webhook', whatsappRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'Mawazo webhook server started');
});

export default app;
