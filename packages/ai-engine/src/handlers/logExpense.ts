/**
 * log_expense handler.
 * Inserts a debit transaction and returns a confirmation message.
 */

import { getPool } from '../db';
import { createLogger, formatUGX, parseUGXAmount } from '@mawazo/shared';
import type { ClassifiedIntent } from '../types/intents';

const logger = createLogger('ai-engine:logExpense');

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export async function handleLogExpense(
  phoneNumber: string,
  userMessage: string,
  classified: ClassifiedIntent
): Promise<string> {
  const pool = getPool();

  // Get business
  const { rows: businessRows } = await pool.query<{ id: string; name: string | null }>(
    'SELECT id, name FROM businesses WHERE phone_number = $1',
    [phoneNumber]
  );

  if (businessRows.length === 0) {
    return "I don't have your business set up yet. Type 'Hi' to get started.";
  }

  const business = businessRows[0];

  // Use amount from entities, or try to parse from the raw message
  let amountUgx = classified.entities.amount_ugx;
  if (!amountUgx) {
    const parsed = parseUGXAmount(userMessage);
    if (parsed) amountUgx = parsed;
  }

  if (!amountUgx || amountUgx <= 0) {
    return "I noticed you want to record an expense, but I couldn't find the amount. Can you tell me how much it was? For example: 'Paid 120,000 for rent'";
  }

  const description = classified.entities.description ?? 'Expense';
  const category    = classified.entities.category ?? 'Operating Expenses';

  // Find matching system category (escape LIKE wildcards from AI-extracted category)
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
       VALUES ($1, $2, 'debit', $3, $4, 'telegram', CURRENT_DATE)`,
      [business.id, amountUgx, categoryId, description]
    );

    logger.info({ businessId: business.id, amountUgx }, 'Expense recorded');

    // Use Claude's reply (preserves user's language — Luganda, English, etc.)
    // Fall back to English template if Claude's reply looks like a fallback/error.
    const claudeReply = classified.reply;
    if (claudeReply && !claudeReply.startsWith("I didn't quite understand")) {
      return claudeReply;
    }
    return `Recorded! Expense of ${formatUGX(amountUgx)} for ${description}. 📝`;
  } catch (err) {
    logger.error({ err, businessId: business.id }, 'Failed to insert expense transaction');
    return "I had trouble recording that expense. Please try again.";
  }
}
