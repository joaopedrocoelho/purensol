import React, { useEffect, useRef } from "react";
import type { GoogleFormItem } from "@/types/googleForms";
import { isSection } from "./issection";
import { isGiftSection, stripGiftSectionPrefix } from "@/lib/utils";

interface StepIndicatorProps {
  steps: GoogleFormItem[][];
  currentStep: number;
  totalFormSteps: number;
  showReview: boolean;
}

export default function StepIndicator({
  steps,
  currentStep,
  totalFormSteps,
  showReview,
}: StepIndicatorProps) {
  const activeStepRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll active step into view when it changes
  useEffect(() => {
    if (activeStepRef.current && containerRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentStep, showReview]);

  if (totalFormSteps <= 1) {
    return null;
  }

  return (
    <div className="mb-6">
      <div
        ref={containerRef}
        className="flex items-center space-x-2 overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {steps.map((stepItems, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;

          // Get step name from section header or gift section
          const sectionItem = stepItems.find((item) =>
            item.title ? isSection(item.title) : false
          );
          const giftItem = stepItems.find((item) => isGiftSection(item));
          let stepName = `步驟 ${stepNumber}`;

          if (giftItem?.title) {
            // For gift sections, use the title without the prefix
            const cleanTitle = stripGiftSectionPrefix(giftItem.title);
            // Try to extract a meaningful name from the gift section title
            // Pattern: "✦第一階段滿額贈..." -> "第一階段滿額贈"
            const match = cleanTitle.match(/✦\s*(.+?)(?:。|✦)/);
            if (match && match[1]) {
              stepName = match[1].trim();
            } else {
              stepName = cleanTitle.substring(0, 20); // Use first 20 chars if no pattern match
            }
          } else if (sectionItem?.title) {
            // Extract section name from pattern "✦ x區 ✦"
            const match = sectionItem.title.match(/✦\s*(.+?)\s*區\s*✦/);
            if (match && match[1]) {
              stepName = match[1];
            }
          }

          return (
            <React.Fragment key={stepNumber}>
              <div
                ref={isActive ? activeStepRef : null}
                className="flex items-center shrink-0"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    isActive || isCompleted
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNumber}
                </div>
                <span className="ml-2 text-sm text-gray-600 whitespace-nowrap">
                  {stepName}
                </span>
              </div>
              {stepNumber < totalFormSteps && (
                <div className="w-8 h-0.5 bg-gray-300 shrink-0"></div>
              )}
            </React.Fragment>
          );
        })}
        {/* Review step */}
        <div className="w-8 h-0.5 bg-gray-300 shrink-0"></div>
        <div
          ref={showReview ? activeStepRef : null}
          className="flex items-center shrink-0"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              showReview
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {totalFormSteps + 1}
          </div>
          <span className="ml-2 text-sm text-gray-600 whitespace-nowrap">
            確認訂單
          </span>
        </div>
      </div>
    </div>
  );
}
