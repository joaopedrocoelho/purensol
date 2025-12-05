import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { GoogleFormItem, Question } from "@/types/googleForms";
import { stripGiftSectionPrefix } from "@/lib/utils";

interface TimeQuestionProps {
  item: GoogleFormItem;
  question: Question;
  fieldName: string;
  isRequired: boolean;
  register: UseFormRegister<Record<string, string | string[] | number>>;
  errors: FieldErrors<Record<string, string | string[] | number>>;
}

export default function TimeQuestion({
  item,
  question,
  fieldName,
  isRequired,
  register,
  errors,
}: TimeQuestionProps) {
  if (!question.timeQuestion) {
    return null;
  }

  return (
    <div key={item.itemId} className="mb-10">
      <label className="block text-lg font-black text-gray-700 mb-2">
        {stripGiftSectionPrefix(item.title)}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      {item.description && (
        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
      )}

      <input
        type={question.timeQuestion.duration ? "text" : "time"}
        {...register(fieldName, { required: isRequired })}
        className="text-black w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={question.timeQuestion.duration ? "HH:MM" : ""}
      />

      {errors[fieldName] && (
        <p className="mt-1 text-sm text-red-600">This field is required</p>
      )}
    </div>
  );
}
