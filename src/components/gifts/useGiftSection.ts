import { useMemo } from "react";
import type { GoogleFormItem } from "@/types/googleForms";
import { getThresholds } from "../gifthreshold";
import { log } from "@/lib/log";

export interface GiftSectionData {
  item: GoogleFormItem;
  questionId: string;
  thresholds: Array<{ amount: number; gifts: number }>;
}

/**
 * Hook to find and process all gift sections in a form
 */
export function useGiftSections(
  items: GoogleFormItem[]
): Map<string, GiftSectionData> {
  return useMemo(() => {
    const giftSections = new Map<string, GiftSectionData>();

    items.forEach((item) => {
      if (item.title?.startsWith("~gift_section~")) {
        const questionId =
          item.questionItem?.question?.questionId ||
          item.questionGroupItem?.questions?.[0]?.questionId;

        if (questionId) {
          // Parse thresholds from the title (the prefix doesn't affect parsing)
          const thresholds = getThresholds(item.title);
          if (thresholds.length === 0) {
            log.warn("Failed to parse gift thresholds from title:", item.title);
          } else {
            log.log("Gift section found:", {
              questionId,
              title: item.title,
              thresholds,
            });
          }

          giftSections.set(questionId, {
            item,
            questionId,
            thresholds,
          });
        } else {
          log.warn(
            "Gift section item found but no questionId:",
            item.itemId,
            item.title
          );
        }
      }
    });

    return giftSections;
  }, [items]);
}

/**
 * Calculate max allowed selections for a gift section based on total and thresholds
 */
export function calculateMaxGiftSelections(
  totalExcludingGift: number,
  thresholds: Array<{ amount: number; gifts: number }>
): number {
  if (thresholds.length === 0) {
    return 0;
  }

  // Find the highest threshold that the total meets or exceeds
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalExcludingGift >= thresholds[i].amount) {
      return thresholds[i].gifts;
    }
  }

  return 0;
}
