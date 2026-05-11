/**
 * RM currency formatter utility
 * Requirements: 1.3, 7.3, 9.3, 13.3, 15.3, 22.4
 *
 * Formats a numeric value as a Malaysian Ringgit string.
 * Examples:
 *   formatRM(1200)     → "RM 1,200.00"
 *   formatRM(50000)    → "RM 50,000.00"
 *   formatRM(1200.5)   → "RM 1,200.50"
 *   formatRM(0)        → "RM 0.00"
 */
export function formatRM(value: number): string {
  return (
    "RM " +
    value.toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
