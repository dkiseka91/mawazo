/**
 * Telegram bot command handlers.
 *
 * /help    — list commands
 * /report  — quick this-month P&L
 * /export  — CSV of all transactions sent as file
 * /delete  — initiate GDPR account deletion
 * /deleteconfirm — confirm deletion
 * /upgrade <tier> <phone> — initiate MTN MoMo subscription payment
 * /webapp  — get a web-app chat link (valid 24 h)
 */

import crypto    from 'crypto';
import axios     from 'axios';
import FormData  from 'form-data';
import { createLogger, formatUGX } from '@mawazo/shared';
import { getPool, TIER_LIMITS, TIER_PRICES_UGX, storeWebappToken } from '@mawazo/ai-engine';
import { createMoMoClientFromEnv } from '@mawazo/momo';

const logger = createLogger('webhook:telegram-commands');

// ── Telegram helpers ──────────────────────────────────────────────────────────

function getApiBase(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return `https://api.telegram.org/bot${token}`;
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  try {
    await axios.post(
      `${getApiBase()}/sendMessage`,
      { chat_id: chatId, text, parse_mode: 'Markdown' },
      { timeout: 10_000 }
    );
  } catch (err) {
    logger.error({ err, chatId }, 'Failed to send Telegram message');
  }
}

async function sendDocument(
  chatId: number,
  filename: string,
  content: Buffer,
  mimeType: string,
  caption: string
): Promise<void> {
  try {
    const form = new FormData();
    form.append('chat_id', chatId.toString());
    form.append('document', content, { filename, contentType: mimeType });
    form.append('caption', caption);
    await axios.post(`${getApiBase()}/sendDocument`, form, {
      headers: form.getHeaders(),
      timeout: 30_000,
    });
  } catch (err) {
    logger.error({ err, chatId, filename }, 'Failed to send Telegram document');
  }
}

// ── /help ─────────────────────────────────────────────────────────────────────

async function handleHelp(chatId: number): Promise<void> {
  await sendMessage(chatId,
    `*Mawazo — AI Bookkeeper* 📒\n\n` +
    `*Recording transactions:*\n` +
    `  Just type naturally:\n` +
    `  _"Sold goods for 150,000"_\n` +
    `  _"Paid rent 400,000"_\n\n` +
    `*Commands:*\n` +
    `  /report — this month's P&L summary\n` +
    `  /export — download all transactions as CSV\n` +
    `  /upgrade — upgrade your plan\n` +
    `  /webapp  — open the web chat interface\n` +
    `  /delete  — delete your account & data\n` +
    `  /help    — show this message`
  );
}

// ── /report ───────────────────────────────────────────────────────────────────

async function handleReport(chatId: number, userId: string): Promise<void> {
  const pool = getPool();
  const { rows: biz } = await pool.query<{ id: string; name: string | null }>(
    'SELECT id, name FROM businesses WHERE phone_number = $1',
    [userId]
  );
  if (biz.length === 0) {
    await sendMessage(chatId, "You don't have a business set up yet. Type _Hi_ to get started.");
    return;
  }
  const { id, name } = biz[0];
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [inc, exp] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount_ugx),0) AS total FROM transactions
        WHERE business_id=$1 AND type='credit' AND transaction_date>=$2`, [id, start]
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount_ugx),0) AS total FROM transactions
        WHERE business_id=$1 AND type='debit' AND transaction_date>=$2`, [id, start]
    ),
  ]);

  const income   = parseInt(inc.rows[0].total, 10);
  const expenses = parseInt(exp.rows[0].total, 10);
  const net      = income - expenses;

  await sendMessage(chatId,
    `📊 *This Month* — ${name ?? 'Your Business'}\n\n` +
    `💰 Income:   ${formatUGX(income)}\n` +
    `💸 Expenses: ${formatUGX(expenses)}\n` +
    `${net >= 0 ? '✅' : '⚠️'} Net:      ${formatUGX(Math.abs(net))} ${net >= 0 ? 'profit' : 'loss'}`
  );
}

// ── /export ───────────────────────────────────────────────────────────────────

async function handleExport(chatId: number, userId: string): Promise<void> {
  const pool = getPool();
  const { rows: biz } = await pool.query<{ id: string; name: string | null }>(
    'SELECT id, name FROM businesses WHERE phone_number = $1',
    [userId]
  );
  if (biz.length === 0) {
    await sendMessage(chatId, "You don't have a business set up yet. Type _Hi_ to get started.");
    return;
  }

  await sendMessage(chatId, '⏳ Generating your CSV export…');

  const { rows } = await pool.query<{
    date: string; type: string; amount: string; category: string | null; description: string | null;
  }>(
    `SELECT t.transaction_date::date AS date,
            t.type,
            t.amount_ugx             AS amount,
            c.name                   AS category,
            t.description
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.business_id = $1
      ORDER BY t.transaction_date DESC, t.created_at DESC`,
    [biz[0].id]
  );

  if (rows.length === 0) {
    await sendMessage(chatId, 'No transactions recorded yet.');
    return;
  }

  const csv = [
    'Date,Type,Amount (UGX),Category,Description',
    ...rows.map((r) =>
      `${r.date},${r.type},${r.amount},${csvEscape(r.category ?? '')},${csvEscape(r.description ?? '')}`
    ),
  ].join('\n');

  const now = new Date().toISOString().slice(0, 10);
  await sendDocument(
    chatId,
    `mawazo-export-${now}.csv`,
    Buffer.from(csv, 'utf8'),
    'text/csv',
    `${biz[0].name ?? 'Mawazo'} — all transactions as of ${now}`
  );
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ── /delete + /deleteconfirm ──────────────────────────────────────────────────

async function handleDelete(chatId: number): Promise<void> {
  await sendMessage(chatId,
    `⚠️ *Delete Account*\n\n` +
    `This will permanently delete:\n` +
    `  • Your business profile\n` +
    `  • All transactions & reports\n` +
    `  • Your conversation history\n\n` +
    `This *cannot* be undone.\n\n` +
    `To confirm, send: /deleteconfirm`
  );
}

async function handleDeleteConfirm(chatId: number, userId: string): Promise<void> {
  const pool = getPool();
  const { rows: biz } = await pool.query<{ id: string }>(
    'SELECT id FROM businesses WHERE phone_number = $1',
    [userId]
  );
  if (biz.length === 0) {
    await sendMessage(chatId, 'No account found for this chat.');
    return;
  }

  await pool.query('DELETE FROM businesses WHERE phone_number = $1', [userId]);
  logger.info({ userId }, 'Business account deleted on user request (GDPR)');
  await sendMessage(chatId,
    '✅ Your account and all associated data have been permanently deleted.\n\n' +
    'Thank you for using Mawazo. Type _Hi_ if you ever want to start again.'
  );
}

// ── /upgrade ──────────────────────────────────────────────────────────────────

async function handleUpgrade(chatId: number, userId: string, args: string[]): Promise<void> {
  const validTiers = ['starter', 'growth', 'pro'];

  if (args.length === 0) {
    const lines = validTiers.map((t) => {
      const lim = isFinite(TIER_LIMITS[t]) ? `${TIER_LIMITS[t].toLocaleString()} tx/mo` : 'unlimited';
      return `  • *${t.charAt(0).toUpperCase() + t.slice(1)}*: UGX ${TIER_PRICES_UGX[t].toLocaleString()}/month — ${lim}`;
    });
    await sendMessage(chatId,
      `*Upgrade your plan* 📈\n\n${lines.join('\n')}\n\n` +
      `Send: _/upgrade starter 256701234567_\n` +
      `(replace with your tier and MoMo number)`
    );
    return;
  }

  const [tier, phone] = args;
  if (!validTiers.includes(tier?.toLowerCase())) {
    await sendMessage(chatId, `Invalid tier. Choose: ${validTiers.join(', ')}`);
    return;
  }
  if (!phone || !/^256\d{9}$/.test(phone)) {
    await sendMessage(chatId, 'Invalid phone number. Use format: _256701234567_ (Uganda MTN/Airtel number)');
    return;
  }

  const pool = getPool();
  const { rows: biz } = await pool.query<{ id: string; subscription_tier: string }>(
    'SELECT id, subscription_tier FROM businesses WHERE phone_number = $1',
    [userId]
  );
  if (biz.length === 0) {
    await sendMessage(chatId, "No account found. Type _Hi_ to get started.");
    return;
  }
  if (biz[0].subscription_tier === tier) {
    await sendMessage(chatId, `You're already on the *${tier}* plan.`);
    return;
  }

  const amountUgx = TIER_PRICES_UGX[tier];
  const momoClient = createMoMoClientFromEnv();

  if (!momoClient) {
    await sendMessage(chatId,
      `*Manual Upgrade Process*\n\n` +
      `Send *UGX ${amountUgx.toLocaleString()}* to our MoMo number and ` +
      `we'll upgrade your account within 1 business day.\n\n` +
      `Contact support to complete the upgrade.`
    );
    return;
  }

  await sendMessage(chatId, `⏳ Sending payment request of UGX ${amountUgx.toLocaleString()} to *${phone}*…`);

  try {
    const { rows: [payment] } = await pool.query<{ id: string }>(
      `INSERT INTO subscription_payments
         (business_id, tier, amount_ugx, phone_number, telegram_chat_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [biz[0].id, tier, amountUgx, phone, chatId]
    );

    const result = await momoClient.initiatePayment({
      amount:           amountUgx,
      currency:         'UGX',
      externalId:       payment.id,
      payerPhoneNumber: phone,
      payerMessage:     `Mawazo ${tier} plan — UGX ${amountUgx.toLocaleString()}/month`,
      payeeNote:        `Mawazo subscription upgrade: ${tier}`,
    });

    await pool.query(
      'UPDATE subscription_payments SET momo_reference = $1 WHERE id = $2',
      [result.referenceId, payment.id]
    );

    await sendMessage(chatId,
      `✅ Payment request sent to *${phone}*.\n\n` +
      `Check your phone and approve the UGX ${amountUgx.toLocaleString()} request.\n\n` +
      `Your plan will be upgraded automatically once payment is confirmed (usually within 2 minutes).`
    );

    // Poll for payment status in background (up to 10 min)
    pollPayment(result.referenceId, payment.id, biz[0].id, chatId, tier, momoClient);
  } catch (err) {
    logger.error({ err, userId, tier }, 'Failed to initiate MoMo payment');
    await sendMessage(chatId, '❌ Could not initiate payment. Please try again or contact support.');
  }
}

function pollPayment(
  momoRef: string,
  paymentId: string,
  businessId: string,
  chatId: number,
  tier: string,
  client: ReturnType<typeof createMoMoClientFromEnv> & object
): void {
  const pool = getPool();
  let attempts = 0;
  const MAX = 20; // 20 × 30 s = 10 min

  const timer = setInterval(async () => {
    attempts++;
    try {
      const status = await client.getPaymentStatus(momoRef);

      if (status === 'SUCCESSFUL') {
        clearInterval(timer);
        await pool.query(
          `UPDATE subscription_payments SET status='completed', paid_at=NOW() WHERE id=$1`,
          [paymentId]
        );
        await pool.query(
          `UPDATE businesses SET subscription_tier=$1 WHERE id=$2`,
          [tier, businessId]
        );
        await sendMessage(chatId,
          `🎉 Payment confirmed! Your plan is now *${tier.charAt(0).toUpperCase() + tier.slice(1)}*.\n\n` +
          `Enjoy ${isFinite(TIER_LIMITS[tier]) ? TIER_LIMITS[tier].toLocaleString() + ' transactions/month' : 'unlimited transactions'}!`
        );
      } else if (status === 'FAILED') {
        clearInterval(timer);
        await pool.query(`UPDATE subscription_payments SET status='failed' WHERE id=$1`, [paymentId]);
        await sendMessage(chatId, '❌ Payment was declined or failed. Please try again with /upgrade');
      } else if (attempts >= MAX) {
        clearInterval(timer);
        await pool.query(`UPDATE subscription_payments SET status='expired' WHERE id=$1`, [paymentId]);
        await sendMessage(chatId, '⏱️ Payment timed out. Please try /upgrade again if you wish to upgrade.');
      }
    } catch (err) {
      logger.error({ err, momoRef }, 'Error polling MoMo payment');
      if (attempts >= MAX) clearInterval(timer);
    }
  }, 30_000);
}

// ── /webapp ───────────────────────────────────────────────────────────────────

async function handleWebapp(chatId: number, userId: string): Promise<void> {
  const token   = crypto.randomBytes(24).toString('hex');
  const baseUrl = process.env.WEBAPP_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://your-app.onrender.com';

  await storeWebappToken(token, userId);

  await sendMessage(chatId,
    `🌐 *Open Mawazo in your browser:*\n\n` +
    `${baseUrl}/chat?token=${token}\n\n` +
    `_Link is valid for 24 hours._`
  );
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

/**
 * Returns true if the message was a command and was handled here.
 * Returns false if it should be forwarded to the AI engine.
 */
export async function handleCommand(
  chatId: number,
  userId: string,
  command: string,
  args: string[]
): Promise<boolean> {
  try {
    switch (command) {
      case '/help':  case '/start':
        await handleHelp(chatId);
        return true;
      case '/report':
        await handleReport(chatId, userId);
        return true;
      case '/export':
        await handleExport(chatId, userId);
        return true;
      case '/delete':
        await handleDelete(chatId);
        return true;
      case '/deleteconfirm':
        await handleDeleteConfirm(chatId, userId);
        return true;
      case '/upgrade':
        await handleUpgrade(chatId, userId, args);
        return true;
      case '/webapp':
        await handleWebapp(chatId, userId);
        return true;
      default:
        return false;
    }
  } catch (err) {
    logger.error({ err, command, chatId }, 'Error in command handler');
    await sendMessage(chatId, 'Something went wrong. Please try again.');
    return true;
  }
}
