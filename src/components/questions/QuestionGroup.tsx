import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { GoogleFormItem } from "@/types/googleForms";
import { stripGiftSectionPrefix } from "@/lib/utils";

interface QuestionGroupProps {
  item: GoogleFormItem;
  register: UseFormRegister<Record<string, string | string[] | number>>;
  errors: FieldErrors<Record<string, string | string[] | number>>;
  transformImageUrl: (contentUri: string, width: number) => string;
}

export default function QuestionGroup({
  item,
  register,
  errors,
  transformImageUrl,
}: QuestionGroupProps) {
  if (!item.questionGroupItem?.questions || item.questionGroupItem?.grid) {
    return null;
  }

  return (
    <div key={item.itemId} className="mb-10">
      {item.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {stripGiftSectionPrefix(item.title)}
        </h3>
      )}
      {item.description && (
        <p className="text-sm text-gray-500 mb-4">{item.description}</p>
      )}
      <div className="space-y-4">
        {item.questionGroupItem.questions.map((q, qIdx) => {
          const fieldName = `question_${q.questionId}`;
          const isRequired = q.required || false;

          // Render choice questions
          if (q.choiceQuestion) {
            const { type, options } = q.choiceQuestion;
            const isMultiple = type === "CHECKBOX";

            return (
              <div key={q.questionId} className="mb-4">
                <label className="block text-md font-bold text-gray-700 mb-2">
                  {q.choiceQuestion.options?.[0]?.value || `問題 ${qIdx + 1}`}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                {type === "DROP_DOWN" ? (
                  <select
                    {...register(fieldName, { required: isRequired })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">請選擇選項</option>
                    {options.map((option, idx) => (
                      <option key={idx} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3">
                    {options.map((option, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <label className="flex items-start space-x-3 cursor-pointer flex-1">
                          <input
                            type={isMultiple ? "checkbox" : "radio"}
                            {...register(fieldName, {
                              required: isRequired,
                            })}
                            value={option.value}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                    ))}
                  </div>
                )}
                {errors[fieldName] && (
                  <p className="mt-1 text-sm text-red-600">此欄位為必填</p>
                )}
              </div>
            );
          }

          // Render text questions
          if (q.textQuestion) {
            const isParagraph = q.textQuestion.paragraph;
            return (
              <div key={q.questionId} className="mb-4">
                <label className="block text-lg font-black text-gray-700 mb-2">
                  文字問題 {qIdx + 1}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                {isParagraph ? (
                  <textarea
                    {...register(fieldName, { required: isRequired })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="請輸入您的答案..."
                  />
                ) : (
                  <input
                    type="text"
                    {...register(fieldName, { required: isRequired })}
                    className="w-full px-4 py-2 border border-gray-300 text-black rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="請輸入您的答案..."
                  />
                )}
                {errors[fieldName] && (
                  <p className="mt-1 text-sm text-red-600">此欄位為必填</p>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
