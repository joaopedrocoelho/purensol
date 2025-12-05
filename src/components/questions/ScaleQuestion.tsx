import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { GoogleFormItem, Question } from "@/types/googleForms";
import { stripGiftSectionPrefix } from "@/lib/utils";

interface ScaleQuestionProps {
  item: GoogleFormItem;
  question: Question;
  fieldName: string;
  isRequired: boolean;
  register: UseFormRegister<Record<string, string | string[] | number>>;
  errors: FieldErrors<Record<string, string | string[] | number>>;
}

export default function ScaleQuestion({
  item,
  question,
  fieldName,
  isRequired,
  register,
  errors,
}: ScaleQuestionProps) {
  if (!question.scaleQuestion) {
    return null;
  }

  const { low, high, lowLabel, highLabel } = question.scaleQuestion;
  const scaleOptions = Array.from(
    { length: high - low + 1 },
    (_, i) => low + i
  );

  return (
    <div key={item.itemId} className="mb-10">
      <label className="block text-lg font-black text-gray-700 mb-2">
        {stripGiftSectionPrefix(item.title)}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      {item.description && (
        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
      )}

      <div className="flex items-center space-x-4">
        {lowLabel && <span className="text-sm text-gray-600">{lowLabel}</span>}
        <div className="flex space-x-2">
          {scaleOptions.map((value) => (
            <label
              key={value}
              className="flex items-center space-x-1 cursor-pointer"
            >
              <input
                type="radio"
                {...register(fieldName, { required: isRequired })}
                value={value}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{value}</span>
            </label>
          ))}
        </div>
        {highLabel && (
          <span className="text-sm text-gray-600">{highLabel}</span>
        )}
      </div>

      {errors[fieldName] && (
        <p className="mt-1 text-sm text-red-600">This field is required</p>
      )}
    </div>
  );
}
