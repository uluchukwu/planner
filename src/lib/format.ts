// Users type currency as a free-text 3-letter code in Settings (not validated against
// the real ISO 4217 list), so Intl.NumberFormat can throw RangeError on a bad code —
// fall back to a plain "CODE 12.34" rendering rather than crashing the page.
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
