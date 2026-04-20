import { getPool } from './db';

export const TIER_LIMITS: Record<string, number> = {
  free:    50,
  starter: 500,
  growth:  5_000,
  pro:     Infinity,
};

export const TIER_PRICES_UGX: Record<string, number> = {
  starter: 25_000,
  growth:  75_000,
  pro:    200_000,
};

export interface TierCheckResult {
  allowed: boolean;
  used:    number;
  limit:   number;
  tier:    string;
}

export async function checkMonthlyLimit(businessId: string, tier: string): Promise<TierCheckResult> {
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  if (!isFinite(limit)) return { allowed: true, used: 0, limit, tier };

  const pool = getPool();
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
       FROM transactions
      WHERE business_id = $1
        AND transaction_date >= date_trunc('month', CURRENT_DATE)`,
    [businessId]
  );

  const used = parseInt(rows[0].count, 10);
  return { allowed: used < limit, used, limit, tier };
}

export function buildUpgradePrompt(result: TierCheckResult): string {
  const lines = ['starter', 'growth', 'pro'].map((t) => {
    const lim = isFinite(TIER_LIMITS[t]) ? `${TIER_LIMITS[t].toLocaleString()} tx/mo` : 'unlimited';
    return `  • *${t.charAt(0).toUpperCase() + t.slice(1)}*: UGX ${TIER_PRICES_UGX[t].toLocaleString()}/month — ${lim}`;
  });

  return (
    `⚠️ You've reached the *${result.limit} transaction* monthly limit on the *${result.tier}* plan ` +
    `(${result.used}/${result.limit} used).\n\n` +
    `Upgrade to keep recording:\n${lines.join('\n')}\n\n` +
    `Send: _/upgrade starter 256701234567_ (your tier + MoMo number)`
  );
}
