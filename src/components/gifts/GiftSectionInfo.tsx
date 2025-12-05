import React from "react";

interface GiftSectionInfoProps {
  thresholds: Array<{ amount: number; gifts: number }>;
  totalExcludingGift: number;
  maxGiftSelections: number;
  currentGiftCount: number;
}

export default function GiftSectionInfo({
  thresholds,
  totalExcludingGift,
  maxGiftSelections,
  currentGiftCount,
}: GiftSectionInfoProps) {
  if (thresholds.length === 0) {
    return (
      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">無法解析贈品規則</p>
      </div>
    );
  }

  const firstThreshold = thresholds[0];

  if (totalExcludingGift < firstThreshold.amount) {
    return (
      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          消費滿 ${firstThreshold.amount.toLocaleString()} 可選{" "}
          {firstThreshold.gifts} 項
        </p>
      </div>
    );
  }

  return (
    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <p className="text-sm text-yellow-800">
        目前可選 {maxGiftSelections} 項 (已選 {currentGiftCount}/
        {maxGiftSelections})
      </p>
    </div>
  );
}
