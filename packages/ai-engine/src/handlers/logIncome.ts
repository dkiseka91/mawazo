/**
 * log_income handler.
 * Inserts a credit transaction and returns a confirmation message.
 */

import { getPool } from '../db';
import { createLogger, formatUGX, parseUGXAmount } from '@mawazo/shared';
import { checkMonthlyLimit, buildUpgradePrompt } from '../tierLimits';
import type { ClassifiedIntent } from '../types/intents';

const logger = createLogger('ai-engine:logIncome');

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export async function handleLogIncome(
  phoneNumber: string,
  userMessage: string,
  classified: ClassifiedIntent
): Promise<string> {
  const pool = getPool();

  const { rows: businessRows } = await pool.query<{ id: string; name: string | null; subscription_tier: string }>(
    'SELECT id, name, subscription_tier FROM businesses WHERE phone_number = $1',
    [phoneNumber]
  );

  if (businessRows.length === 0) {
    return "I don't have your business set up yet. Type 'Hi' to get started.";
  }

  const business = businessRows[0];

  // Enforce monthly transaction limit for this tier
  const tierCheck = await checkMonthlyLimit(business.id, business.subscription_tier ?? 'free');
  if (!tierCheck.allowed) {
    return buildUpgradePrompt(tierCheck);
  }

  let amountUgx = classified.entities.amount_ugx;
  if (!amountUgx) {
    const parsed = parseUGXAmount(userMessage);
    if (parsed) amountUgx = parsed;
  }

  if (!amountUgx || amountUgx <= 0) {
    return "I noticed you want to record income, but I couldn't find the amount. Can you tell me how much? For example: 'Sold goods for 200,000'";
  }

  const description = classified.entities.description ?? 'Income';
  const category    = classified.entities.category ?? 'Sales Revenue';

  const { rows: catRows } = await pool.query<{ id: string }>(
    `SELECT id FROM categories
      WHERE is_system_default = true
        AND LOWER(name) LIKE LOWER($1) ESCAPE '\\'
      LIMIT 1`,
    [`%${escapeLike(category)}%`]
  );
  const categoryId = catRows[0]?.id ?? null;

  try {
    await pool.query(
      `INSERT INTO transactions
        (business_id, amount_ugx, type, category_id, description, source, transaction_date)
       VALUES ($1, $2, 'credit', $3, $4, 'telegram', CURRENT_DATE)`,
      [business.id, amountUgx, categoryId, description]
    );

    logger.info({ businessId: business.id, amountUgx }, 'Income recorded');

    // Use Claude's reply (preserves user's language — Luganda, English, etc.)
    const claudeReply = classified.reply;
    if (claudeReply && !claudeReply.startsWith("I didn't quite understand")) {
      return claudeReply;
    }
    return `Recorded! Income of ${formatUGX(amountUgx)} from ${description}. 💰`;
  } catch (err) {
    logger.error({ err, businessId: business.id }, 'Failed to insert income transaction');
    return "I had trouble recording that income. Please try again.";
  }
}
