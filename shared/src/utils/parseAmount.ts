/**
 * Parse a UGX amount from various user input formats.
 * Handles: "120000", "120,000", "120k", "120K", "1.2m", "1.2M", "1,200,000"
 *
 * Returns null if no valid amount can be parsed.
 *
 * @example parseUGXAmount("120,000")  → 120000
 * @example parseUGXAmount("120k")     → 120000
 * @example parseUGXAmount("1.5m")     → 1500000
 * @example parseUGXAmount("hello")    → null
 */
export function parseUGXAmount(input: string): number | null {
  if (!input || typeof input !== 'string') return null;

  const cleaned = input.trim().replace(/\s/g, '');

  // Match patterns like: 120k, 1.5M, 2.3m, 120K
  const shortMatch = cleaned.match(/^([\d,.]+)([kKmM])$/);
  if (shortMatch) {
    const base = parseFloat(shortMatch[1].replace(/,/g, ''));
    if (isNaN(base)) return null;
    const multiplier = shortMatch[2].toLowerCase() === 'k' ? 1_000 : 1_000_000;
    return Math.round(base * multiplier);
  }

  // Strip commas and parse as plain number
  const stripped = cleaned.replace(/,/g, '');
  const value = parseFloat(stripped);
  if (isNaN(value) || value <= 0) return null;

  return Math.round(value);
}
