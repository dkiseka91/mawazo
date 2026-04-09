/**
 * Meta webhook signature verification middleware.
 *
 * Meta signs every POST payload with HMAC-SHA256 using your App Secret.
 * The signature is in the X-Hub-Signature-256 header as "sha256=<hex>".
 *
 * This middleware rejects any request where the signature does not match,
 * protecting against forged webhook calls.
 *
 * IMPORTANT: Express must be configured to capture the raw body BEFORE JSON
 * parsing so we can recompute the HMAC over the exact bytes Meta signed.
 * See index.ts for the express.json({ verify }) setup.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '@mawazo/shared';

const logger = createLogger('webhook:signature');

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

export function verifySignature(
  req: RequestWithRawBody,
  res: Response,
  next: NextFunction
): void {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    // In development without a secret configured, skip verification
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('WHATSAPP_APP_SECRET not set — skipping signature verification (dev only)');
      next();
      return;
    }
    logger.error('WHATSAPP_APP_SECRET not set in production — rejecting request');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const signatureHeader = req.headers['x-hub-signature-256'];
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    logger.warn({ ip: req.ip }, 'Missing X-Hub-Signature-256 header');
    res.status(403).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.error('Raw body not available — check express.json verify configuration');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const expectedSignature = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(expectedSignature, 'utf8');
  const received = Buffer.from(signatureHeader, 'utf8');

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    logger.warn({ ip: req.ip }, 'Invalid webhook signature — rejecting');
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
