import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { GoogleFormItem, Question } from "@/types/googleForms";
import Photo from "../Photo";
import { transformImageUrl } from "@/lib/transformImageUrl";

interface ChoiceQuestionProps {
  item: GoogleFormItem;
  question: Question;
  fieldName: string;
  isRequired: boolean;
  register: UseFormRegister<Record<string, string | string[] | number>>;
  errors: FieldErrors<Record<string, string | string[] | number>>;
  // Gift section props (optional)
  isGiftSection?: boolean;
  isFirstGiftSection?: boolean;
  isSecondGiftSection?: boolean;
  firstGiftThresholds?: Array<{ amount: number; gifts: number }>;
  secondGiftThresholds?: Array<{ amount: number; gifts: number }>;
  totalExcludingGift?: number;
  maxGiftSelections?: number;
  currentGiftCount?: number;
  currentGiftSelections?: string[];
  isGiftLimitReached?: boolean;
}

export default function ChoiceQuestion({
  item,
  question,
  fieldName,
  isRequired,
  register,
  errors,
  isGiftSection = false,
  isFirstGiftSection = false,
  isSecondGiftSection = false,
  firstGiftThresholds = [],
  secondGiftThresholds = [],
  totalExcludingGift = 0,
  maxGiftSelections = 0,
  currentGiftCount = 0,
  currentGiftSelections = [],
  isGiftLimitReached = false,
}: ChoiceQuestionProps) {
  if (!question.choiceQuestion) {
    return null;
  }

  const { type, options } = question.choiceQuestion;
  const isMultiple = type === "CHECKBOX";

  return (
    <div key={item.itemId} className="mb-10">
      <label className="block text-lg font-black text-gray-700 mb-2">
        {item.title}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      {item.description && (
        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
      )}

      {/* Gift section limit message */}
      {isGiftSection && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            {isFirstGiftSection
              ? (() => {
                  const thresholds = firstGiftThresholds;
                  if (thresholds.length === 0) {
                    return "無法解析贈品規則";
                  }
                  const firstThreshold = thresholds[0];
                  if (totalExcludingGift < firstThreshold.amount) {
                    return `消費滿 $${firstThreshold.amount.toLocaleString()} 可選 ${
                      firstThreshold.gifts
                    } 項`;
                  }
                  return `目前可選 ${maxGiftSelections} 項 (已選 ${currentGiftCount}/${maxGiftSelections})`;
                })()
              : isSecondGiftSection
              ? (() => {
                  const thresholds = secondGiftThresholds;
                  if (thresholds.length === 0) {
                    return "無法解析贈品規則";
                  }
                  const firstThreshold = thresholds[0];
                  if (totalExcludingGift < firstThreshold.amount) {
                    return `消費滿 $${firstThreshold.amount.toLocaleString()} 可選 ${
                      firstThreshold.gifts
                    } 項`;
                  }
                  return `目前可選 ${maxGiftSelections} 項 (已選 ${currentGiftCount}/${maxGiftSelections})`;
                })()
              : null}
          </p>
        </div>
      )}

      {/* Question item image */}
      {item.questionItem?.image && (
        <Photo image={item.questionItem.image} alt={item.title} />
      )}

      {type === "DROP_DOWN" ? (
        <select
          {...register(fieldName, { required: isRequired })}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select an option</option>
          {options.map((option, idx) => (
            <option key={idx} value={option.value}>
              {option.value}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-3">
          {options.map((option, idx) => {
            const isOptionSelected = Array.isArray(currentGiftSelections)
              ? currentGiftSelections.includes(option.value)
              : false;
            const isDisabled =
              isGiftSection && !isOptionSelected && isGiftLimitReached;

            return (
              <div key={idx} className="flex items-start space-x-3">
                <label
                  className={`flex items-start space-x-3 flex-1 ${
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type={isMultiple ? "checkbox" : "radio"}
                    {...register(fieldName, {
                      required: isRequired,
                    })}
                    value={option.value}
                    disabled={isDisabled}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span className="text-gray-700 block mb-2">
                      {option.value}
                    </span>
                    {option.image && (
                      <div className="mt-2">
                        <img
                          src={transformImageUrl(
                            option.image.contentUri,
                            option.image.properties?.width || 260
                          )}
                          alt={option.value}
                          width={option.image.properties?.width || 260}
                          className="rounded-lg shadow-sm max-w-full h-auto"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      )}

      {errors[fieldName] && (
        <p className="mt-1 text-sm text-red-600">This field is required</p>
      )}
    </div>
  );
}
