import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { GoogleFormItem, Question } from "@/types/googleForms";
import Photo from "../Photo";
import { stripGiftSectionPrefix } from "@/lib/utils";

interface TextQuestionProps {
  item: GoogleFormItem;
  question: Question;
  fieldName: string;
  isRequired: boolean;
  register: UseFormRegister<Record<string, string | string[] | number>>;
  errors: FieldErrors<Record<string, string | string[] | number>>;
}

export default function TextQuestion({
  item,
  question,
  fieldName,
  isRequired,
  register,
  errors,
}: TextQuestionProps) {
  if (!question.textQuestion) {
    return null;
  }

  const isParagraph = question.textQuestion.paragraph;
  const isEmailField = item.title?.toLowerCase().includes("email");

  // More robust email validation pattern
  // Matches: user@domain.com, user.name@domain.co.uk, etc.
  const emailPattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Validation rules
  const validationRules = isRequired
    ? {
        required: "此欄位為必填",
        ...(isEmailField && {
          validate: (value: string | number | string[]) => {
            const emailValue = String(value).trim();
            if (!emailValue) return true; // Required check handles empty
            return emailPattern.test(emailValue) || "請輸入有效的電子郵件地址";
          },
        }),
      }
    : {
        ...(isEmailField && {
          validate: (value: string | number | string[]) => {
            const emailValue = String(value).trim();
            if (!emailValue) return true; // Optional field can be empty
            return emailPattern.test(emailValue) || "請輸入有效的電子郵件地址";
          },
        }),
      };

  return (
    <div key={item.itemId} className="mb-10">
      <label className="block text-lg font-black text-gray-700 mb-2">
        {stripGiftSectionPrefix(item.title)}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      {item.description && (
        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
      )}

      {/* Question item image */}
      {item.questionItem?.image && (
        <Photo
          image={item.questionItem.image}
          alt={stripGiftSectionPrefix(item.title)}
        />
      )}

      {isParagraph ? (
        <textarea
          {...register(fieldName, validationRules)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your answer..."
        />
      ) : (
        <input
          type={isEmailField ? "email" : "text"}
          {...register(fieldName, validationRules)}
          className="text-black w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={
            isEmailField ? "請輸入您的電子郵件地址" : "Enter your answer..."
          }
        />
      )}

      {errors[fieldName] && (
        <p className="mt-1 text-sm text-red-600">
          {(errors[fieldName]?.message as string) || "此欄位為必填"}
        </p>
      )}
    </div>
  );
}
