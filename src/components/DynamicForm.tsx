import React, { useState, useMemo, useEffect } from "react";
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
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();
  const [submitted, setSubmitted] = useState(false);

  // Watch all form values to calculate total
  const formValues = watch();

  // Extract price from item title (format: "$380 紫水晶金屬纏繞墜")
  const extractPrice = (title: string | undefined): number | null => {
    if (!title) return null;
    const match = title.match(/\$(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Create a map of question IDs to prices (from item title)
  const questionPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    form.items.forEach((item) => {
      const price = extractPrice(item.title);
      if (price !== null) {
        // Handle both questionItem and questionGroupItem
        if (item.questionItem?.question) {
          map.set(item.questionItem.question.questionId, price);
        } else if (item.questionGroupItem?.questions) {
          // For question groups, map all questions to the same price
          item.questionGroupItem.questions.forEach((q) => {
            map.set(q.questionId, price);
          });
        }
      }
    });
    return map;
  }, [form.items]);

  // Create a map of option values to prices (from option values themselves)
  const optionPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    form.items.forEach((item) => {
      // Check questionItem options
      if (item.questionItem?.question?.choiceQuestion?.options) {
        item.questionItem.question.choiceQuestion.options.forEach((option) => {
          const price = extractPrice(option.value);
          if (price !== null) {
            map.set(option.value, price);
          }
        });
      }
      // Check questionGroupItem options
      if (item.questionGroupItem?.questions) {
        item.questionGroupItem.questions.forEach((q) => {
          if (q.choiceQuestion?.options) {
            q.choiceQuestion.options.forEach((option) => {
              const price = extractPrice(option.value);
              if (price !== null) {
                map.set(option.value, price);
              }
            });
          }
        });
      }
    });
    return map;
  }, [form.items]);

  // Find the gift section question ID
  const giftQuestionId = useMemo(() => {
    const giftItem = form.items.find(
      (item) =>
        item.title?.includes("✦滿額贈✦") || item.title?.includes("滿額贈")
    );
    return giftItem?.questionItem?.question?.questionId || null;
  }, [form.items]);

  // Calculate total excluding the gift section
  const totalExcludingGift = useMemo(() => {
    let sum = 0;

    Object.entries(formValues).forEach(([fieldName, value]) => {
      // Extract question ID from field name (format: "question_<questionId>")
      const questionIdMatch = fieldName.match(
        /^question_(.+?)(?:_row_\d+_col_\d+)?$/
      );
      if (!questionIdMatch) return;

      const questionId = questionIdMatch[1];

      // Skip the gift section in this calculation
      if (questionId === giftQuestionId) return;

      const questionPrice = questionPriceMap.get(questionId);

      // For checkboxes, react-hook-form returns an array when multiple are selected
      // But it might also return a single string when only one is selected, or undefined when none
      if (Array.isArray(value)) {
        // Each selected checkbox option
        value.forEach((optionValue) => {
          if (typeof optionValue === "string" && optionValue.trim() !== "") {
            // First check if the option value itself has a price
            const optionPrice = optionPriceMap.get(optionValue);
            if (optionPrice !== null && optionPrice !== undefined) {
              sum += optionPrice;
            } else if (questionPrice !== null && questionPrice !== undefined) {
              // Fall back to question/item title price
              sum += questionPrice;
            }
          }
        });
      } else if (value) {
        // Handle single selection (radio or single checkbox)
        if (typeof value === "string" && value.trim() !== "") {
          // First check if the option value itself has a price
          const optionPrice = optionPriceMap.get(value);
          if (optionPrice !== null && optionPrice !== undefined) {
            sum += optionPrice;
          } else if (questionPrice !== null && questionPrice !== undefined) {
            // Fall back to question/item title price
            sum += questionPrice;
          }
        } else if (typeof value === "number" || typeof value === "boolean") {
          // For non-string values, use question price if available
          if (questionPrice !== null && questionPrice !== undefined) {
            sum += questionPrice;
          }
        }
      }
    });

    return sum;
  }, [formValues, questionPriceMap, optionPriceMap, giftQuestionId]);

  // Determine max allowed selections for gift section based on total
  const maxGiftSelections = useMemo(() => {
    if (totalExcludingGift < 2200) return 0;
    if (totalExcludingGift < 4000) return 1;
    if (totalExcludingGift < 5600) return 2;
    if (totalExcludingGift < 6800) return 3;
    return 4;
  }, [totalExcludingGift]);

  // Calculate total including everything (for display)
  const total = useMemo(() => {
    const sum = totalExcludingGift;

    // Add gift section items if any
    if (giftQuestionId) {
      const giftFieldName = `question_${giftQuestionId}`;
      const giftValue = formValues[giftFieldName];

      if (Array.isArray(giftValue)) {
        // Gift items don't have prices, so they don't add to total
        // But we still count them for the selection limit
      }
    }

    return sum;
  }, [totalExcludingGift, formValues, giftQuestionId]);

  // Enforce gift selection limit
  useEffect(() => {
    if (!giftQuestionId) return;

    const giftFieldName = `question_${giftQuestionId}`;
    const currentSelections = formValues[giftFieldName] as string[] | undefined;

    if (
      Array.isArray(currentSelections) &&
      currentSelections.length > maxGiftSelections
    ) {
      // Trim selections to max allowed (keep the first N selections)
      const trimmed = currentSelections.slice(0, maxGiftSelections);
      setValue(giftFieldName, trimmed, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [
    maxGiftSelections,
    giftQuestionId,
    setValue,
    formValues,
    totalExcludingGift,
  ]);

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
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

    // Check if this is the gift section
    const isGiftSection = questionId === giftQuestionId;
    // Watch the specific field to get real-time updates
    const watchedFieldValue = isGiftSection
      ? watch(fieldName)
      : formValues[fieldName];
    const currentGiftSelections = isGiftSection
      ? (watchedFieldValue as string[] | undefined)
      : undefined;
    const currentGiftCount = Array.isArray(currentGiftSelections)
      ? currentGiftSelections.length
      : 0;
    const isGiftLimitReached =
      isGiftSection && currentGiftCount >= maxGiftSelections;

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

          {/* Gift section limit message */}
          {isGiftSection && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                {totalExcludingGift < 2200
                  ? "消費滿 $2,200 可選 1 項"
                  : totalExcludingGift < 4000
                  ? `目前可選 ${maxGiftSelections} 項 (已選 ${currentGiftCount}/${maxGiftSelections})`
                  : totalExcludingGift < 5600
                  ? `目前可選 ${maxGiftSelections} 項 (已選 ${currentGiftCount}/${maxGiftSelections})`
                  : totalExcludingGift < 6800
                  ? `目前可選 ${maxGiftSelections} 項 (已選 ${currentGiftCount}/${maxGiftSelections})`
                  : `目前可選 ${maxGiftSelections} 項 (已選 ${currentGiftCount}/${maxGiftSelections})`}
              </p>
            </div>
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
              className="text-black w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="text-black w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
    <>
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className={`max-w-2xl mx-auto ${total > 0 ? "pb-24" : ""}`}
      >
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

      {/* Total Price Toaster */}
      {
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${total.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {Object.values(formValues).reduce((count: number, value) => {
                    if (Array.isArray(value)) {
                      return count + value.length;
                    }
                    return count + (value ? 1 : 0);
                  }, 0)}{" "}
                  item(s) selected
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  );
}
