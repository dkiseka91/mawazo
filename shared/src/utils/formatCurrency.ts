/**
 * Format a whole-number UGX amount for display.
 * Uganda uses whole shillings — no decimal places.
 *
 * @example formatUGX(120000) → "UGX 120,000"
 * @example formatUGX(1200000) → "UGX 1,200,000"
 */
export function formatUGX(amount: number): string {
  const whole = Math.round(amount);
  return `UGX ${whole.toLocaleString('en-UG')}`;
}

/**
 * Format as a short representation for chat messages.
 *
 * @example formatUGXShort(120000) → "120,000 UGX"
 */
export function formatUGXShort(amount: number): string {
  const whole = Math.round(amount);
  return `${whole.toLocaleString('en-UG')} UGX`;
}
