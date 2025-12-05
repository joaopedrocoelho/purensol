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

/**
 * Check if an item is a gift section
 * @param item - The Google Form item to check
 * @returns True if the item title starts with "~gift_section~"
 */
export function isGiftSection(item: GoogleFormItem): boolean {
  return item.title?.startsWith("~gift_section~") || false;
}

/**
 * Strip the "~gift_section~" prefix from a title for display
 * @param title - The title string that may contain the prefix
 * @returns The title without the "~gift_section~" prefix
 */
export function stripGiftSectionPrefix(title: string | undefined): string {
  if (!title) return "";
  return title.startsWith("~gift_section~")
    ? title.substring("~gift_section~".length).trim()
    : title;
}
