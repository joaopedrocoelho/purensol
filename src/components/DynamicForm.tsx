import React, { useState } from "react";
import { useForm } from "react-hook-form";
import type {
  GoogleForm,
  GoogleFormItem,
  Image as FormImage,
} from "@/types/googleForms";

interface DynamicFormProps {
  form: GoogleForm;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
}

interface FormValues {
  [key: string]: string | string[] | number;
}

export default function DynamicForm({ form, onSubmit }: DynamicFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();
  const [submitted, setSubmitted] = useState(false);

  // Helper function to transform Google Forms image URLs to use our proxy API
  const transformImageUrl = (contentUri: string, width: number): string => {
    // Extract the path from the Google Forms URL
    // Format: https://lh7-rt.googleusercontent.com/formsz/AN7BsV...?key=...
    try {
      const url = new URL(contentUri);
      const pathParts = url.pathname.split("/").filter(Boolean);

      // Extract key from query string
      const keyParam = url.searchParams.get("key") || "";

      // Add width parameter if not present
      let queryString = "";
      if (!contentUri.includes("=w")) {
        // Format: =w260?key=...
        queryString = `=w${width}${keyParam ? `&key=${keyParam}` : ""}`;
      } else {
        // Preserve existing width and key
        const existingQuery = url.search.substring(1); // Remove leading ?
        queryString = existingQuery;
      }

      // Use our API proxy route
      // Format: /api/images/formsz/AN7BsV...?=w260&key=...
      const proxyPath = `/api/images/${pathParts.join("/")}?${queryString}`;
      return proxyPath;
    } catch (error) {
      // Fallback to original URL if parsing fails
      console.error("Error parsing image URL:", error);
      return contentUri;
    }
  };

  const renderImage = (
    image: FormImage | undefined,
    alt: string = "Form image"
  ) => {
    if (!image?.contentUri) return null;

    const width = image.properties?.width || 400;
    const alignment = image.properties?.alignment || "LEFT";
    const imageUrl = transformImageUrl(image.contentUri, width);

    return (
      <div
        className={`my-4 ${
          alignment === "CENTER"
            ? "flex justify-center"
            : alignment === "RIGHT"
            ? "flex justify-end"
            : ""
        }`}
      >
        <img
          src={imageUrl}
          alt={alt}
          width={width}
          className="rounded-lg shadow-sm max-w-full h-auto"
          crossOrigin="anonymous"
        />
      </div>
    );
  };

  const renderQuestion = (item: GoogleFormItem) => {
    // Handle page breaks
    if (item.pageBreakItem) {
      return <hr key={item.itemId} className="my-8 border-gray-300" />;
    }

    // Handle question groups with questions array (not grid)
    if (item.questionGroupItem?.questions && !item.questionGroupItem?.grid) {
      return (
        <div key={item.itemId} className="mb-6">
          {item.title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {item.title}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {q.choiceQuestion.options?.[0]?.value ||
                        `Question ${qIdx + 1}`}
                      {isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
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
                                      width={
                                        option.image.properties?.width || 260
                                      }
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
                      <p className="mt-1 text-sm text-red-600">
                        This field is required
                      </p>
                    )}
                  </div>
                );
              }

              // Render text questions
              if (q.textQuestion) {
                const isParagraph = q.textQuestion.paragraph;
                return (
                  <div key={q.questionId} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Question {qIdx + 1}
                      {isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {isParagraph ? (
                      <textarea
                        {...register(fieldName, { required: isRequired })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your answer..."
                      />
                    ) : (
                      <input
                        type="text"
                        {...register(fieldName, { required: isRequired })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your answer..."
                      />
                    )}
                    {errors[fieldName] && (
                      <p className="mt-1 text-sm text-red-600">
                        This field is required
                      </p>
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

    const question =
      item.questionItem?.question || item.questionGroupItem?.questions?.[0];

    if (!question) {
      return null;
    }

    const questionId = question.questionId;
    const isRequired = question.required || false;
    const fieldName = `question_${questionId}`;

    // Handle choice questions (radio, checkbox, dropdown)
    if (question.choiceQuestion) {
      const { type, options } = question.choiceQuestion;
      const isMultiple = type === "CHECKBOX";

      return (
        <div key={item.itemId} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.title}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {item.description && (
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
          )}

          {/* Question item image */}
          {item.questionItem?.image &&
            renderImage(item.questionItem.image, item.title)}

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
              {options.map((option, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <label className="flex items-start space-x-3 cursor-pointer flex-1">
                    <input
                      type={isMultiple ? "checkbox" : "radio"}
                      {...register(fieldName, { required: isRequired })}
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
            <p className="mt-1 text-sm text-red-600">This field is required</p>
          )}
        </div>
      );
    }

    // Handle text questions
    if (question.textQuestion) {
      const isParagraph = question.textQuestion.paragraph;

      return (
        <div key={item.itemId} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.title}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {item.description && (
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
          )}

          {/* Question item image */}
          {item.questionItem?.image &&
            renderImage(item.questionItem.image, item.title)}

          {isParagraph ? (
            <textarea
              {...register(fieldName, { required: isRequired })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your answer..."
            />
          ) : (
            <input
              type="text"
              {...register(fieldName, { required: isRequired })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your answer..."
            />
          )}

          {errors[fieldName] && (
            <p className="mt-1 text-sm text-red-600">This field is required</p>
          )}
        </div>
      );
    }

    // Handle scale questions
    if (question.scaleQuestion) {
      const { low, high, lowLabel, highLabel } = question.scaleQuestion;
      const scaleOptions = Array.from(
        { length: high - low + 1 },
        (_, i) => low + i
      );

      return (
        <div key={item.itemId} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.title}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {item.description && (
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
          )}

          <div className="flex items-center space-x-4">
            {lowLabel && (
              <span className="text-sm text-gray-600">{lowLabel}</span>
            )}
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

    // Handle date questions
    if (question.dateQuestion) {
      return (
        <div key={item.itemId} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.title}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {item.description && (
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
          )}

          <input
            type={question.dateQuestion.includeTime ? "datetime-local" : "date"}
            {...register(fieldName, { required: isRequired })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {errors[fieldName] && (
            <p className="mt-1 text-sm text-red-600">This field is required</p>
          )}
        </div>
      );
    }

    // Handle time questions
    if (question.timeQuestion) {
      return (
        <div key={item.itemId} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.title}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {item.description && (
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
          )}

          <input
            type={question.timeQuestion.duration ? "text" : "time"}
            {...register(fieldName, { required: isRequired })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={question.timeQuestion.duration ? "HH:MM" : ""}
          />

          {errors[fieldName] && (
            <p className="mt-1 text-sm text-red-600">This field is required</p>
          )}
        </div>
      );
    }

    // Handle file upload questions
    if (question.fileUploadQuestion) {
      return (
        <div key={item.itemId} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.title}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {item.description && (
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
          )}

          <input
            type="file"
            {...register(fieldName, { required: isRequired })}
            multiple={
              question.fileUploadQuestion.maxFiles
                ? question.fileUploadQuestion.maxFiles > 1
                : false
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {errors[fieldName] && (
            <p className="mt-1 text-sm text-red-600">This field is required</p>
          )}
        </div>
      );
    }

    // Handle question groups (grid questions)
    if (item.questionGroupItem?.grid) {
      const grid = item.questionGroupItem.grid;
      const { columns } = grid;
      const rows = grid.rows || [];

      // Safety checks
      if (!columns || !columns.options || !Array.isArray(columns.options)) {
        console.warn("Invalid grid columns structure", item);
        return null;
      }

      const isMultiple = columns.type === "CHECKBOX";
      const questions = item.questionGroupItem.questions || [];

      // If no rows in grid, use questions array to generate rows
      const effectiveRows =
        rows.length > 0
          ? rows
          : questions.map((q, idx) => ({ value: `Option ${idx + 1}` }));

      // Get questionId from the first question in the group, or use itemId as fallback
      const gridQuestionId = questions[0]?.questionId || item.itemId;
      const gridIsRequired = questions[0]?.required || false;

      return (
        <div key={item.itemId} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.title}
            {gridIsRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {item.description && (
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
          )}

          {/* Question group image */}
          {item.questionGroupItem?.image &&
            renderImage(item.questionGroupItem.image, item.title)}

          {effectiveRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-md">
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

    return null;
  };

  const onFormSubmit = async (data: FormValues) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        console.log("Form submitted:", data);
      }
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-xl font-semibold text-green-800 mb-2">
          Form Submitted Successfully!
        </h2>
        <p className="text-green-700">Thank you for your submission.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {form.info.title}
        </h1>
        {form.info.description && (
          <p className="text-gray-600 mb-6 whitespace-pre-line">
            {form.info.description}
          </p>
        )}

        <div className="space-y-4">
          {form.items.map((item) => renderQuestion(item))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </form>
  );
}
