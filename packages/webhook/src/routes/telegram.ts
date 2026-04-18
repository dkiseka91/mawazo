/**
 * Telegram webhook route.
 *
 * POST /telegram  — receives updates from Telegram Bot API
 * GET  /telegram/set-webhook — registers the webhook with Telegram (admin-only)
 * GET  /telegram/info        — shows current webhook status (admin-only)
 *
 * Security:
 *  - POST /telegram verifies X-Telegram-Bot-Api-Secret-Token using timing-safe compare.
 *    TELEGRAM_WEBHOOK_SECRET is required in production; missing it is a startup error.
 *  - /set-webhook and /info require X-Admin-Secret header matching ADMIN_SECRET env var.
 */

import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { createLogger } from '@mawazo/shared';
import { handleTelegramUpdate } from '../services/telegramRouter';
import type { TelegramUpdate } from '../types/telegram';

const router = Router();
const logger = createLogger('webhook:telegram-route');

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a comparison to prevent timing leak on length difference
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdminSecret(req: import('express').Request, res: import('express').Response): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    res.status(503).json({ error: 'ADMIN_SECRET not configured on this server' });
    return false;
  }
  const incoming = req.headers['x-admin-secret'] as string | undefined;
  if (!incoming || !timingSafeEqual(incoming, adminSecret)) {
    logger.warn({ ip: req.ip }, 'Rejected admin request — invalid X-Admin-Secret');
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

/**
 * POST /telegram
 * Telegram sends all updates here. Always return 200 so Telegram
 * doesn't retry the delivery.
 */
router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!secret) {
      // In production this should never happen (startup check in index.ts).
      // In development, log a warning and continue.
      if (process.env.NODE_ENV === 'production') {
        logger.error('TELEGRAM_WEBHOOK_SECRET is not set in production — rejecting all updates');
        return;
      }
      logger.warn('TELEGRAM_WEBHOOK_SECRET not set — skipping verification (dev only)');
    } else {
      const incoming = (req.headers['x-telegram-bot-api-secret-token'] as string) ?? '';
      if (!timingSafeEqual(incoming, secret)) {
        logger.warn({ ip: req.ip }, 'Invalid Telegram secret token — ignoring update');
        return;
      }
    }

    const update = req.body as TelegramUpdate;
    await handleTelegramUpdate(update);
  } catch (err) {
    logger.error({ err }, 'Error processing Telegram update');
  }
});

/**
 * GET /telegram/set-webhook?url=https://your-railway-url
 * Admin-only. Call once after deployment to register the webhook with Telegram.
 * Requires X-Admin-Secret header matching ADMIN_SECRET env var.
 */
router.get('/set-webhook', async (req, res) => {
  if (!requireAdminSecret(req, res)) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
    return;
  }

  const webhookUrl = req.query.url as string;
  if (!webhookUrl) {
    res.status(400).json({ error: 'Missing ?url= parameter. Pass your public Railway URL.' });
    return;
  }

  const targetUrl = `${webhookUrl}/telegram`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  try {
    const payload: Record<string, string> = { url: targetUrl };
    if (secret) payload.secret_token = secret;

    const { data } = await axios.post(
      `https://api.telegram.org/bot${token}/setWebhook`,
      payload
    );

    logger.info({ targetUrl, result: data }, 'Telegram webhook registered');
    res.json({ ok: true, webhookUrl: targetUrl, telegram: data });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      res.status(500).json({ error: 'Telegram API error', detail: err.response?.data });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
});

/**
 * GET /telegram/info — check current webhook status (admin-only)
 */
router.get('/info', async (req, res) => {
  if (!requireAdminSecret(req, res)) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
    return;
  }

  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch webhook info' });
  }
});

export { router as telegramRouter };
