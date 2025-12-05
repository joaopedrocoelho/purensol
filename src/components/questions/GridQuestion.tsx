import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { GoogleFormItem } from "@/types/googleForms";
import Photo from "../Photo";
import { log } from "@/lib/log";
import { stripGiftSectionPrefix } from "@/lib/utils";

interface GridQuestionProps {
  item: GoogleFormItem;
  register: UseFormRegister<Record<string, string | string[] | number>>;
  errors: FieldErrors<Record<string, string | string[] | number>>;
}

export default function GridQuestion({
  item,
  register,
  errors,
}: GridQuestionProps) {
  if (!item.questionGroupItem?.grid) {
    return null;
  }

  const grid = item.questionGroupItem.grid;
  const { columns } = grid;
  const rows = grid.rows || [];

  // Safety checks
  if (!columns || !columns.options || !Array.isArray(columns.options)) {
    log.warn("Invalid grid columns structure", item);
    return null;
  }

  const isMultiple = columns.type === "CHECKBOX";
  const questions = item.questionGroupItem.questions || [];

  // If no rows in grid, use questions array to generate rows
  const effectiveRows =
    rows.length > 0 ? rows : questions.map((q, idx) => ({ value: "" }));

  // Get questionId from the first question in the group, or use itemId as fallback
  const gridQuestionId = questions[0]?.questionId || item.itemId;
  const gridIsRequired = questions[0]?.required || false;

  return (
    <div key={item.itemId} className="mb-10">
      <label className="block text-lg font-black text-gray-700 mb-2">
        {stripGiftSectionPrefix(item.title)}
        {gridIsRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      {item.description && (
        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
      )}

      {/* Question group image */}
      {item.questionGroupItem?.image && (
        <Photo
          image={item.questionGroupItem.image}
          alt={stripGiftSectionPrefix(item.title)}
        />
      )}

      {effectiveRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-md text-black">
            <thead>
              <tr>
                <th className="px-4 py-2 border border-gray-300 bg-gray-50"></th>
                {columns.options.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-2 border border-gray-300 bg-gray-50 text-center"
                  >
                    {col.value}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {effectiveRows.map((row, rowIdx) => {
                // Use questionId from questions array if available
                const rowQuestionId =
                  questions[rowIdx]?.questionId ||
                  `${gridQuestionId}_row_${rowIdx}`;
                return (
                  <tr key={rowIdx}>
                    <td className="px-4 py-2 border border-gray-300 bg-gray-50 font-medium">
                      {row.value}
                    </td>
                    {columns.options.map((col, colIdx) => {
                      // For grid questions, each row might have its own questionId
                      const fieldName =
                        questions.length > rowIdx
                          ? `question_${rowQuestionId}`
                          : `question_${gridQuestionId}_row_${rowIdx}_col_${colIdx}`;
                      return (
                        <td
                          key={colIdx}
                          className="px-4 py-2 border border-gray-300 text-center"
                        >
                          <input
                            type={isMultiple ? "checkbox" : "radio"}
                            {...register(fieldName, {
                              required: gridIsRequired,
                            })}
                            value={col.value}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // Fallback: render as regular choice question if no rows
        questions.length > 0 &&
        questions[0].choiceQuestion && (
          <div className="space-y-2">
            {questions[0].choiceQuestion.options.map((option, idx) => (
              <label
                key={idx}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  {...register(`question_${gridQuestionId}`, {
                    required: gridIsRequired,
                  })}
                  value={option.value}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option.value}</span>
              </label>
            ))}
          </div>
        )
      )}
    </div>
  );
}
