/**
 * WhatsApp webhook routes.
 *
 * GET  /webhook — Meta hub challenge verification (called once when setting up webhook)
 * POST /webhook — Receives incoming messages and status updates from Meta
 */

import { Router } from 'express';
import { createLogger } from '@mawazo/shared';
import { verifySignature } from '../middleware/verifySignature';
import { handleIncomingValue } from '../services/messageRouter';
import type { WebhookPayload } from '../types/whatsapp';

const router = Router();
const logger = createLogger('webhook:routes');

/**
 * GET /webhook
 * Meta calls this once with hub.challenge to verify the webhook endpoint.
 */
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook verification successful');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, tokenPresent: !!token }, 'Webhook verification failed — invalid mode or token');
    res.status(403).json({ error: 'Verification failed' });
  }
});

/**
 * POST /webhook
 * Receives WhatsApp messages and status updates. MUST always return 200
 * so Meta does not retry the delivery.
 */
router.post('/', verifySignature, async (req, res) => {
  // Acknowledge immediately — WhatsApp expects a quick 200
  res.sendStatus(200);

  try {
    const payload = req.body as WebhookPayload;

    if (payload.object !== 'whatsapp_business_account') {
      logger.debug({ object: payload.object }, 'Ignoring non-WhatsApp webhook');
      return;
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === 'messages') {
          await handleIncomingValue(change.value);
        }
      }
    }
  } catch (err) {
    // Log but never throw — we already sent 200 to Meta
    logger.error({ err }, 'Error processing webhook payload');
  }
});

export { router as whatsappRouter };
