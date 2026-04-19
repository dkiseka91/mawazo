/**
 * MTN MoMo callback webhook.
 *
 * POST /momo/callback — MTN calls this when a payment changes status.
 * The X-Reference-Id header or body.referenceId identifies the payment.
 */

import { Router } from 'express';
import { createLogger } from '@mawazo/shared';
import { getPool, TIER_LIMITS } from '@mawazo/ai-engine';
import { sendMessage } from '../services/telegramCommands';

const router = Router();
const logger = createLogger('webhook:momo');

router.post('/callback', async (req, res) => {
  // Acknowledge immediately — MTN retries on non-2xx
  res.sendStatus(200);

  try {
    const body = req.body as {
      referenceId?: string;
      status?: string;
      financialTransactionId?: string;
    };

    const referenceId = body.referenceId ?? (req.headers['x-reference-id'] as string);
    const status      = body.status;

    if (!referenceId || !status) {
      logger.warn({ body, headers: req.headers }, 'MoMo callback missing referenceId or status');
      return;
    }

    logger.info({ referenceId, status }, 'MoMo callback received');

    const pool = getPool();
    const { rows } = await pool.query<{
      id: string; business_id: string; tier: string; telegram_chat_id: string | null; status: string;
    }>(
      `SELECT id, business_id, tier, telegram_chat_id, status
         FROM subscription_payments
        WHERE momo_reference = $1`,
      [referenceId]
    );

    if (rows.length === 0) {
      logger.warn({ referenceId }, 'MoMo callback: no payment record found');
      return;
    }

    const payment = rows[0];
    if (payment.status !== 'pending') {
      logger.info({ referenceId }, 'MoMo callback: payment already processed');
      return;
    }

    if (status === 'SUCCESSFUL') {
      await pool.query(
        `UPDATE subscription_payments SET status='completed', paid_at=NOW() WHERE id=$1`,
        [payment.id]
      );
      await pool.query(
        `UPDATE businesses SET subscription_tier=$1 WHERE id=$2`,
        [payment.tier, payment.business_id]
      );
      logger.info({ businessId: payment.business_id, tier: payment.tier }, 'Subscription upgraded via MoMo callback');

      if (payment.telegram_chat_id) {
        const chatId = parseInt(payment.telegram_chat_id, 10);
        const lim    = TIER_LIMITS[payment.tier];
        await sendMessage(chatId,
          `🎉 Payment confirmed! Your plan is now *${payment.tier.charAt(0).toUpperCase() + payment.tier.slice(1)}*.\n\n` +
          `Enjoy ${isFinite(lim) ? lim.toLocaleString() + ' transactions/month' : 'unlimited transactions'}!`
        );
      }
    } else if (status === 'FAILED') {
      await pool.query(
        `UPDATE subscription_payments SET status='failed' WHERE id=$1`,
        [payment.id]
      );
      if (payment.telegram_chat_id) {
        const chatId = parseInt(payment.telegram_chat_id, 10);
        await sendMessage(chatId, '❌ Payment failed or was declined. Please try /upgrade again.');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error processing MoMo callback');
  }
});

export { router as momoRouter };
