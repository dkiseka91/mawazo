/**
 * request_report handler.
 * Generates a basic P&L summary from the database for the requested period.
 */

import { getPool } from '../db';
import { createLogger, formatUGX } from '@mawazo/shared';
import type { ClassifiedIntent } from '../types/intents';

const logger = createLogger('ai-engine:report');

function getPeriodDates(period: string | null): { start: Date; end: Date; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!period || period.toLowerCase().includes('today')) {
    return { start: today, end: today, label: 'Today' };
  }
  if (period.toLowerCase().includes('this week') || period.toLowerCase().includes('week')) {
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    return { start, end: today, label: 'This week' };
  }
  if (period.toLowerCase().includes('last month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end, label: 'Last month' };
  }
  // Default: this month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: today, label: 'This month' };
}

export async function handleRequestReport(
  phoneNumber: string,
  _userMessage: string,
  classified: ClassifiedIntent
): Promise<string> {
  const pool = getPool();

  const { rows: businessRows } = await pool.query<{ id: string; name: string | null }>(
    'SELECT id, name FROM businesses WHERE phone_number = $1',
    [phoneNumber]
  );

  if (businessRows.length === 0) {
    return "I don't have your business set up yet. Type 'Hi' to get started.";
  }

  const business = businessRows[0];
  const { start, end, label } = getPeriodDates(classified.entities.period);

  try {
    // Income by category
    const { rows: incomeRows } = await pool.query<{ category: string; total: string }>(
      `SELECT COALESCE(c.name, 'Uncategorised') AS category,
              SUM(t.amount_ugx) AS total
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.business_id = $1
          AND t.type = 'credit'
          AND t.transaction_date BETWEEN $2 AND $3
        GROUP BY c.name
        ORDER BY total DESC`,
      [business.id, start, end]
    );

    // Expenses by category
    const { rows: expenseRows } = await pool.query<{ category: string; total: string }>(
      `SELECT COALESCE(c.name, 'Uncategorised') AS category,
              SUM(t.amount_ugx) AS total
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.business_id = $1
          AND t.type = 'debit'
          AND t.transaction_date BETWEEN $2 AND $3
        GROUP BY c.name
        ORDER BY total DESC`,
      [business.id, start, end]
    );

    const totalIncome   = incomeRows.reduce((sum, r) => sum + parseInt(r.total, 10), 0);
    const totalExpenses = expenseRows.reduce((sum, r) => sum + parseInt(r.total, 10), 0);
    const netProfit     = totalIncome - totalExpenses;

    if (totalIncome === 0 && totalExpenses === 0) {
      return `No transactions recorded for ${label.toLowerCase()} yet. Start by telling me about a sale or expense!`;
    }

    let report = `📊 *${label}'s Summary*${business.name ? ` — ${business.name}` : ''}\n\n`;

    report += `💰 *Income: ${formatUGX(totalIncome)}*\n`;
    for (const row of incomeRows) {
      report += `   ${row.category}: ${formatUGX(parseInt(row.total, 10))}\n`;
    }

    report += `\n💸 *Expenses: ${formatUGX(totalExpenses)}*\n`;
    for (const row of expenseRows) {
      report += `   ${row.category}: ${formatUGX(parseInt(row.total, 10))}\n`;
    }

    report += `\n${netProfit >= 0 ? '✅' : '⚠️'} *Net: ${formatUGX(Math.abs(netProfit))} ${netProfit >= 0 ? 'profit' : 'loss'}*`;

    logger.info({ businessId: business.id, label, totalIncome, totalExpenses }, 'Report generated');
    return report;
  } catch (err) {
    logger.error({ err, businessId: business.id }, 'Failed to generate report');
    return "I had trouble generating your report. Please try again.";
  }
}
