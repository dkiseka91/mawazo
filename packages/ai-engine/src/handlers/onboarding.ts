/**
 * Onboarding handler.
 *
 * Multi-turn flow:
 *  1. Greet → ask business name
 *  2. Save name → ask business type
 *  3. Save type → mark onboarding complete, then immediately process any
 *     transaction intent the user included in that message (no data loss)
 */

import { getPool } from '../db';
import { createLogger, formatUGX } from '@mawazo/shared';
import { appendMessage, updateOnboardingStep, getSession } from '../conversationManager';
import type { ClassifiedIntent } from '../types/intents';
import type { Business } from '@mawazo/shared';

const logger = createLogger('ai-engine:onboarding');

export async function handleOnboarding(
  phoneNumber: string,
  userMessage: string,
  classified: ClassifiedIntent
): Promise<string> {
  const pool = getPool();

  try {
    // Check if business exists
    const { rows } = await pool.query<Business>(
      'SELECT * FROM businesses WHERE phone_number = $1',
      [phoneNumber]
    );

    if (rows.length > 0 && rows[0].onboarding_complete) {
      // Returning user — give welcome back message
      const business = rows[0];
      const summary = await getMonthSummary(business.id);
      return `Welcome back${business.name ? `, ${business.name}` : ''}! 👋\n\nThis month so far:\n• Income: ${formatUGX(summary.income)}\n• Expenses: ${formatUGX(summary.expenses)}\n• Net: ${formatUGX(summary.income - summary.expenses)}\n\nWhat would you like to record today?`;
    }

    const session = await getSession(phoneNumber);
    const step = session?.onboardingStep ?? null;

    if (!step || step === 'ask_name') {
      // First time — create or find business record
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO businesses (phone_number) VALUES ($1) ON CONFLICT (phone_number) DO NOTHING',
          [phoneNumber]
        );
      }

      await updateOnboardingStep(phoneNumber, 'ask_business_type');

      return "Hello! I'm Mawazo, your AI bookkeeper 📒\n\nI'll help you track income and expenses through Telegram — no spreadsheets, no hassle.\n\nFirst, what's the name of your business?";
    }

    if (step === 'ask_business_type') {
      // Prefer Claude's extracted description entity (strips "My business name is ..."),
      // fall back to raw message only if entity extraction failed.
      const businessName = (classified.entities.description?.trim() || userMessage.trim());
      await pool.query(
        'UPDATE businesses SET name = $1 WHERE phone_number = $2',
        [businessName, phoneNumber]
      );
      await updateOnboardingStep(phoneNumber, 'ask_industry');

      return `Great name — ${businessName}! 🎉\n\nWhat type of business is it? (e.g. retail shop, restaurant, salon, transport, farming, services)`;
    }

    if (step === 'ask_industry') {
      // If the user sent a transaction instead of answering the industry question,
      // complete onboarding with a sensible default so the transaction is not lost.
      const isTransaction = classified.intent === 'log_expense' || classified.intent === 'log_income';
      const industry = isTransaction ? 'general' : userMessage.trim();

      await pool.query(
        `UPDATE businesses
            SET industry = $1, onboarding_complete = true
          WHERE phone_number = $2`,
        [industry, phoneNumber]
      );
      await updateOnboardingStep(phoneNumber, 'complete');

      if (isTransaction) {
        // Signal to processMessage that onboarding is now done so it can re-route
        // to the correct transaction handler. We return a sentinel string starting
        // with "__REROUTE__" that processMessage detects.
        return '__REROUTE__';
      }

      return `Perfect! You're all set up ✅\n\nYou can now record transactions like:\n• "Sold goods for 150,000"\n• "Paid rent 400,000"\n• "Show me this month's profit"\n\nWhat's your first entry?`;
    }

    // Fallback — return Claude's reply
    return classified.reply;
  } catch (err) {
    logger.error({ err, phoneNumber }, 'Onboarding handler error');
    return "I'm having trouble setting up your account right now. Please try again in a moment.";
  }
}

async function getMonthSummary(businessId: string): Promise<{ income: number; expenses: number }> {
  const pool = getPool();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { rows } = await pool.query<{ type: string; total: string }>(
    `SELECT type, COALESCE(SUM(amount_ugx), 0) AS total
       FROM transactions
      WHERE business_id = $1 AND transaction_date >= $2
      GROUP BY type`,
    [businessId, start]
  );

  let income = 0;
  let expenses = 0;
  for (const row of rows) {
    if (row.type === 'credit') income = parseInt(row.total, 10);
    if (row.type === 'debit')  expenses = parseInt(row.total, 10);
  }
  return { income, expenses };
}
