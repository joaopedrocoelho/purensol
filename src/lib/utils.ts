import type { GoogleFormItem } from "@/types/googleForms";

/**
 * Extract price from item title (format: "$380 紫水晶金屬纏繞墜")
 * @param title - The title string that may contain a price
 * @returns The extracted price as a number, or null if no price is found
 */
export function extractPrice(title: string | undefined): number | null {
  if (!title) return null;
  const match = title.match(/\$(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Helper function to check if an item has a question (can be rendered)
 * @param item - The Google Form item to check
 * @returns True if the item has a question, question group, or page break
 */
export function hasQuestion(item: GoogleFormItem): boolean {
  return !!(
    item.questionItem?.question ||
    item.questionGroupItem?.questions ||
    item.pageBreakItem
  );
}
