/**
 * Telegram webhook route.
 *
 * POST /telegram  — receives updates from Telegram Bot API
 * GET  /telegram/set-webhook — convenience endpoint to register the webhook with Telegram
 *
 * Security: Telegram can be configured to send a secret token header
 * (X-Telegram-Bot-Api-Secret-Token). Set TELEGRAM_WEBHOOK_SECRET in env
 * to enable verification. If not set, verification is skipped (dev-friendly).
 */

import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '@mawazo/shared';
import { handleTelegramUpdate } from '../services/telegramRouter';
import type { TelegramUpdate } from '../types/telegram';

const router = Router();
const logger = createLogger('webhook:telegram-route');

/**
 * POST /telegram
 * Telegram sends all updates here. Always return 200 so Telegram
 * doesn't retry the delivery.
 */
router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) {
      const incoming = req.headers['x-telegram-bot-api-secret-token'];
      if (incoming !== secret) {
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
 * Call this once after deployment to tell Telegram where to send updates.
 * Example: https://your-app.up.railway.app/telegram/set-webhook?url=https://your-app.up.railway.app
 */
router.get('/set-webhook', async (req, res) => {
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
 * GET /telegram/info — check current webhook status
 */
router.get('/info', async (_req, res) => {
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
