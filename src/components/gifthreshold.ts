/**
 * Parses gift thresholds from a gift section title string
 * Example: "✦第一階段滿額贈。原礦約2-3m，適合隨身攜帶✦ 滿2500*1、5000*2、7000*3、8500*4"
 * Returns: [{ amount: 2500, gifts: 1 }, { amount: 5000, gifts: 2 }, ...]
 * Sorted by amount in ascending order
 */
export function getThresholds(
  label: string | undefined
): Array<{ amount: number; gifts: number }> {
  if (!label) {
    return [];
  }

  // Pattern: First match is 滿{amount}*{count}, subsequent matches can be just {amount}*{count}
  // Format: "滿2500*1、5000*2、7000*3" where only first has 滿
  // Also handles: "滿 2500 * 1, 5000 * 2" with spaces
  const thresholds: Array<{ amount: number; gifts: number }> = [];

  // First, try to match the pattern starting with 滿
  // Then match subsequent patterns that might not have 滿
  // Split by common separators (、, ,) and process each part
  const parts = label.split(/[、,，]/);

  for (const part of parts) {
    // Try pattern with 滿 first
    let match = part.match(/滿\s*(\d+)\s*\*\s*(\d+)/);
    if (!match) {
      // If no 滿, try pattern without it (for subsequent items)
      match = part.match(/(\d+)\s*\*\s*(\d+)/);
    }

    if (match) {
      const amount = parseInt(match[1], 10);
      const gifts = parseInt(match[2], 10);
      if (!isNaN(amount) && !isNaN(gifts) && amount > 0 && gifts > 0) {
        thresholds.push({ amount, gifts });
      }
    }
  }

  // Sort by amount in ascending order
  return thresholds.sort((a, b) => a.amount - b.amount);
}
