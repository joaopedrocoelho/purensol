import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import type {
  GoogleForm,
  GoogleFormItem,
  Image as FormImage,
} from "@/types/googleForms";
import { getThresholds } from "./gifthreshold";
import { log } from "@/lib/log";

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
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<FormValues | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

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

  // Find the first gift section item and question ID (第一階段滿額贈)
  const firstGiftItem = useMemo(() => {
    const item = form.items.find(
      (item) =>
        item.title?.startsWith("✦第一階段滿額贈") ||
        item.title?.startsWith("第一階段滿額贈")
    );
    if (!item) {
      log.warn(
        "First gift item not found. Available titles:",
        form.items.map((i) => i.title).filter(Boolean)
      );
    } else {
      log.log("First gift item found:", item.title);
    }
    return item;
  }, [form.items]);

  // Split form items into steps
  const firstGiftItemIndex = useMemo(() => {
    if (!firstGiftItem) return -1;
    return form.items.findIndex((item) => item.itemId === firstGiftItem.itemId);
  }, [form.items, firstGiftItem]);

  const step1Items = useMemo(() => {
    if (firstGiftItemIndex === -1) {
      // If no gift item found, all items go to step 1
      return form.items;
    }
    return form.items.slice(0, firstGiftItemIndex);
  }, [form.items, firstGiftItemIndex]);

  const step2Items = useMemo(() => {
    if (firstGiftItemIndex === -1) {
      // If no gift item found, step 2 is empty
      return [];
    }
    return form.items.slice(firstGiftItemIndex);
  }, [form.items, firstGiftItemIndex]);

  const firstGiftQuestionId = useMemo(() => {
    return firstGiftItem?.questionItem?.question?.questionId || null;
  }, [firstGiftItem]);

  // Find the second gift section item and question ID (第二階段滿額贈)
  const secondGiftItem = useMemo(() => {
    const item = form.items.find(
      (item) =>
        item.title?.includes("✦第二階段滿額贈") ||
        item.title?.includes("第二階段滿額贈")
    );
    if (!item) {
      log.warn(
        "Second gift item not found. Available titles:",
        form.items.map((i) => i.title).filter(Boolean)
      );
    } else {
      log.log("Second gift item found:", item.title);
    }
    return item;
  }, [form.items]);

  const secondGiftQuestionId = useMemo(() => {
    return secondGiftItem?.questionItem?.question?.questionId || null;
  }, [secondGiftItem]);

  // Parse gift thresholds from titles
  const firstGiftThresholds = useMemo(() => {
    const thresholds = getThresholds(firstGiftItem?.title);
    if (firstGiftItem?.title && thresholds.length === 0) {
      log.warn(
        "Failed to parse first gift thresholds from title:",
        firstGiftItem.title
      );
    } else if (thresholds.length > 0) {
      log.log("First gift thresholds parsed:", thresholds);
    }
    return thresholds;
  }, [firstGiftItem]);

  const secondGiftThresholds = useMemo(() => {
    const thresholds = getThresholds(secondGiftItem?.title);
    if (secondGiftItem?.title && thresholds.length === 0) {
      log.warn(
        "Failed to parse second gift thresholds from title:",
        secondGiftItem.title
      );
    } else if (thresholds.length > 0) {
      log.log("Second gift thresholds parsed:", thresholds);
    }
    return thresholds;
  }, [secondGiftItem]);

  // Create a set of text question IDs to exclude from count
  const textQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    form.items.forEach((item) => {
      // Check questionItem
      if (item.questionItem?.question?.textQuestion) {
        ids.add(item.questionItem.question.questionId);
      }
      // Check questionGroupItem questions
      if (item.questionGroupItem?.questions) {
        item.questionGroupItem.questions.forEach((q) => {
          if (q.textQuestion) {
            ids.add(q.questionId);
          }
        });
      }
    });
    return ids;
  }, [form.items]);

  // Create a map of option values to images
  const optionImageMap = useMemo(() => {
    const map = new Map<string, FormImage>();
    form.items.forEach((item) => {
      // Check questionItem options
      if (item.questionItem?.question?.choiceQuestion?.options) {
        item.questionItem.question.choiceQuestion.options.forEach((option) => {
          if (option.image) {
            map.set(option.value, option.image);
          }
        });
      }
      // Check questionGroupItem options
      if (item.questionGroupItem?.questions) {
        item.questionGroupItem.questions.forEach((q) => {
          if (q.choiceQuestion?.options) {
            q.choiceQuestion.options.forEach((option) => {
              if (option.image) {
                map.set(option.value, option.image);
              }
            });
          }
        });
      }
    });
    return map;
  }, [form.items]);

  // Create a map of question IDs to item images
  const questionItemImageMap = useMemo(() => {
    const map = new Map<string, FormImage>();
    form.items.forEach((item) => {
      const image = item.questionItem?.image || item.questionGroupItem?.image;
      if (image) {
        if (item.questionItem?.question) {
          map.set(item.questionItem.question.questionId, image);
        } else if (item.questionGroupItem?.questions) {
          item.questionGroupItem.questions.forEach((q) => {
            map.set(q.questionId, image);
          });
        }
      }
    });
    return map;
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

      // Skip both gift sections in this calculation
      if (
        questionId === firstGiftQuestionId ||
        questionId === secondGiftQuestionId
      )
        return;

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
  }, [
    formValues,
    questionPriceMap,
    optionPriceMap,
    firstGiftQuestionId,
    secondGiftQuestionId,
  ]);

  // Determine max allowed selections for first gift section based on total and parsed thresholds
  const maxFirstGiftSelections = useMemo(() => {
    if (firstGiftThresholds.length === 0) {
      log.warn("No first gift thresholds found, returning 0");
      return 0;
    }

    log.log("Calculating first gift selections:", {
      totalExcludingGift,
      thresholds: firstGiftThresholds,
    });

    // Find the highest threshold that the total meets or exceeds
    for (let i = firstGiftThresholds.length - 1; i >= 0; i--) {
      if (totalExcludingGift >= firstGiftThresholds[i].amount) {
        log.log(
          `Total ${totalExcludingGift} >= ${firstGiftThresholds[i].amount}, returning ${firstGiftThresholds[i].gifts}`
        );
        return firstGiftThresholds[i].gifts;
      }
    }

    log.log(
      `Total ${totalExcludingGift} doesn't meet any threshold, returning 0`
    );
    return 0;
  }, [totalExcludingGift, firstGiftThresholds]);

  // Determine max allowed selections for second gift section based on total and parsed thresholds
  const maxSecondGiftSelections = useMemo(() => {
    if (secondGiftThresholds.length === 0) {
      log.warn("No second gift thresholds found, returning 0");
      return 0;
    }

    log.log("Calculating second gift selections:", {
      totalExcludingGift,
      thresholds: secondGiftThresholds,
    });

    // Find the highest threshold that the total meets or exceeds
    for (let i = secondGiftThresholds.length - 1; i >= 0; i--) {
      if (totalExcludingGift >= secondGiftThresholds[i].amount) {
        log.log(
          `Total ${totalExcludingGift} >= ${secondGiftThresholds[i].amount}, returning ${secondGiftThresholds[i].gifts}`
        );
        return secondGiftThresholds[i].gifts;
      }
    }

    log.log(
      `Total ${totalExcludingGift} doesn't meet any threshold, returning 0`
    );
    return 0;
  }, [totalExcludingGift, secondGiftThresholds]);

  // Calculate total including everything (for display)
  const total = useMemo(() => {
    const sum = totalExcludingGift;

    // Gift items don't have prices, so they don't add to total
    // But we still count them for the selection limit

    return sum;
  }, [totalExcludingGift]);

  // Enforce first gift selection limit
  useEffect(() => {
    if (!firstGiftQuestionId) return;

    const giftFieldName = `question_${firstGiftQuestionId}`;
    const currentSelections = formValues[giftFieldName] as string[] | undefined;

    if (
      Array.isArray(currentSelections) &&
      currentSelections.length > maxFirstGiftSelections
    ) {
      // Trim selections to max allowed (keep the first N selections)
      const trimmed = currentSelections.slice(0, maxFirstGiftSelections);
      setValue(giftFieldName, trimmed, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [
    maxFirstGiftSelections,
    firstGiftQuestionId,
    setValue,
    formValues,
    totalExcludingGift,
  ]);

  // Enforce second gift selection limit
  useEffect(() => {
    if (!secondGiftQuestionId) return;

    const giftFieldName = `question_${secondGiftQuestionId}`;
    const currentSelections = formValues[giftFieldName] as string[] | undefined;

    if (
      Array.isArray(currentSelections) &&
      currentSelections.length > maxSecondGiftSelections
    ) {
      // Trim selections to max allowed (keep the first N selections)
      const trimmed = currentSelections.slice(0, maxSecondGiftSelections);
      setValue(giftFieldName, trimmed, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [
    maxSecondGiftSelections,
    secondGiftQuestionId,
    setValue,
    formValues,
    totalExcludingGift,
  ]);

  // Scroll to top when review screen is shown
  useEffect(() => {
    if (showReview) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  }, [showReview]);

  // Scroll to top when changing steps
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  }, [currentStep]);

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
      log.error("Error parsing image URL:", error);
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
        <div key={item.itemId} className="mb-10">
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
                    <label className="block text-md font-bold text-gray-700 mb-2">
                      {q.choiceQuestion.options?.[0]?.value ||
                        `問題 ${qIdx + 1}`}
                      {isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
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
                      {isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
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

    const question =
      item.questionItem?.question || item.questionGroupItem?.questions?.[0];

    if (!question) {
      return null;
    }

    const questionId = question.questionId;
    const isRequired = question.required || false;
    const fieldName = `question_${questionId}`;

    // Check if this is a gift section
    const isFirstGiftSection = questionId === firstGiftQuestionId;
    const isSecondGiftSection = questionId === secondGiftQuestionId;
    const isGiftSection = isFirstGiftSection || isSecondGiftSection;

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

    // Determine which max selection limit to use
    const maxGiftSelections = isFirstGiftSection
      ? maxFirstGiftSelections
      : isSecondGiftSection
      ? maxSecondGiftSelections
      : 0;
    const isGiftLimitReached =
      isGiftSection && currentGiftCount >= maxGiftSelections;

    // Handle choice questions (radio, checkbox, dropdown)
    if (question.choiceQuestion) {
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
        <div key={item.itemId} className="mb-10">
          <label className="block text-lg font-black text-gray-700 mb-2">
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
        <div key={item.itemId} className="mb-10">
          <label className="block text-lg font-black text-gray-700 mb-2">
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
        <div key={item.itemId} className="mb-10">
          <label className="block text-lg font-black text-gray-700 mb-2">
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
        <div key={item.itemId} className="mb-10">
          <label className="block text-lg font-black text-gray-700 mb-2">
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
        <div key={item.itemId} className="mb-10">
          <label className="block text-lg font-black text-gray-700 mb-2">
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
        log.warn("Invalid grid columns structure", item);
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
        <div key={item.itemId} className="mb-10">
          <label className="block text-lg font-black text-gray-700 mb-2">
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

  // Extract selected products from review data
  const getSelectedProducts = useMemo(() => {
    if (!reviewData) return [];

    const products: Array<{
      name: string;
      price: number;
      image?: FormImage;
    }> = [];

    Object.entries(reviewData).forEach(([fieldName, value]) => {
      // Extract question ID from field name
      const questionIdMatch = fieldName.match(
        /^question_(.+?)(?:_row_\d+_col_\d+)?$/
      );
      if (!questionIdMatch) return;

      const questionId = questionIdMatch[1];

      // Skip text questions and gift sections
      if (
        textQuestionIds.has(questionId) ||
        questionId === firstGiftQuestionId ||
        questionId === secondGiftQuestionId
      ) {
        return;
      }

      // Handle array values (checkboxes)
      if (Array.isArray(value)) {
        value.forEach((optionValue) => {
          if (typeof optionValue === "string" && optionValue.trim() !== "") {
            const optionPrice = optionPriceMap.get(optionValue);
            const questionPrice = questionPriceMap.get(questionId);
            const price =
              optionPrice !== null && optionPrice !== undefined
                ? optionPrice
                : questionPrice !== null && questionPrice !== undefined
                ? questionPrice
                : null;

            if (price !== null) {
              const optionImage = optionImageMap.get(optionValue);
              const itemImage = questionItemImageMap.get(questionId);
              products.push({
                name: optionValue,
                price,
                image: optionImage || itemImage,
              });
            }
          }
        });
      } else if (value) {
        // Handle single selection (radio or single checkbox)
        if (typeof value === "string" && value.trim() !== "") {
          const optionPrice = optionPriceMap.get(value);
          const questionPrice = questionPriceMap.get(questionId);
          const price =
            optionPrice !== null && optionPrice !== undefined
              ? optionPrice
              : questionPrice !== null && questionPrice !== undefined
              ? questionPrice
              : null;

          if (price !== null) {
            const optionImage = optionImageMap.get(value);
            const itemImage = questionItemImageMap.get(questionId);
            products.push({
              name: value,
              price,
              image: optionImage || itemImage,
            });
          }
        }
      }
    });

    return products;
  }, [
    reviewData,
    textQuestionIds,
    firstGiftQuestionId,
    secondGiftQuestionId,
    optionPriceMap,
    questionPriceMap,
    optionImageMap,
    questionItemImageMap,
  ]);

  const onFormNext = async (data: FormValues) => {
    // Validate only current step's fields
    const itemsToValidate = currentStep === 1 ? step1Items : step2Items;
    const fieldNamesToValidate: string[] = [];

    itemsToValidate.forEach((item) => {
      if (item.questionItem?.question) {
        const questionId = item.questionItem.question.questionId;
        fieldNamesToValidate.push(`question_${questionId}`);
      } else if (item.questionGroupItem?.questions) {
        item.questionGroupItem.questions.forEach((q) => {
          fieldNamesToValidate.push(`question_${q.questionId}`);
        });
      }
    });

    // Trigger validation for current step's fields only
    const isValid = await trigger(fieldNamesToValidate);
    if (!isValid) {
      return; // Don't proceed if validation fails
    }

    if (currentStep === 1) {
      // Move to step 2 (gift section)
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Move to review step
      setReviewData(data);
      setShowReview(true);
    }
  };

  const onStepBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (showReview) {
      setShowReview(false);
      setReviewData(null);
    }
  };

  const onReviewSubmit = async () => {
    if (!reviewData) return;

    try {
      if (onSubmit) {
        await onSubmit(reviewData);
      } else {
        log.log("Form submitted:", reviewData);
      }
      setSubmitted(true);
    } catch (error) {
      log.error("Error submitting form:", error);
    }
  };

  const onReviewCancel = () => {
    setShowReview(false);
    setReviewData(null);
    setCurrentStep(2);
  };

  // Review screen - shows before submission
  if (showReview && !submitted) {
    const selectedProducts = getSelectedProducts;
    const reviewTotal = selectedProducts.reduce(
      (sum, product) => sum + product.price,
      0
    );

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            確認您的訂單
          </h2>

          {selectedProducts.length > 0 ? (
            <>
              <div className="space-y-4 mb-6">
                {selectedProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                  >
                    {product.image && (
                      <div className="shrink-0">
                        <img
                          src={transformImageUrl(
                            product.image.contentUri,
                            product.image.properties?.width || 100
                          )}
                          alt={product.name}
                          width={product.image.properties?.width || 100}
                          className="rounded-lg shadow-sm w-20 h-20 object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-gray-600 text-sm">
                        ${product.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-200 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    總計
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    ${reviewTotal.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onReviewCancel}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  上一頁
                </button>
                <button
                  type="button"
                  onClick={onReviewSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "提交中..." : "提交"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-6">您尚未選擇任何商品</p>
              <button
                type="button"
                onClick={onReviewCancel}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                返回表單
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success screen - shows after submission
  if (submitted) {
    const selectedProducts = getSelectedProducts;
    const submissionTotal = selectedProducts.reduce(
      (sum, product) => sum + product.price,
      0
    );

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            表單提交成功！
          </h2>
          <p className="text-green-700">感謝您的提交。</p>
        </div>

        {selectedProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              已選擇的商品
            </h3>
            <div className="space-y-4 mb-6">
              {selectedProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                >
                  {product.image && (
                    <div className="shrink-0">
                      <img
                        src={transformImageUrl(
                          product.image.contentUri,
                          product.image.properties?.width || 100
                        )}
                        alt={product.name}
                        width={product.image.properties?.width || 100}
                        className="rounded-lg shadow-sm w-20 h-20 object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">
                      {product.name}
                    </p>
                    <p className="text-gray-600 text-sm">
                      ${product.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">
                  總計
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  ${submissionTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Get items for current step
  const currentStepItems = currentStep === 1 ? step1Items : step2Items;

  return (
    <>
      <form
        onSubmit={handleSubmit(onFormNext)}
        className={`max-w-2xl mx-auto ${total > 0 ? "pb-24" : ""}`}
      >
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {form.info.title}
          </h1>
          {form.info.description && currentStep === 1 && (
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {form.info.description}
            </p>
          )}

          {/* Step indicator */}
          {firstGiftItemIndex !== -1 && (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    1
                  </div>
                  <span className="ml-2 text-sm text-gray-600">選擇商品</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= 2
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    2
                  </div>
                  <span className="ml-2 text-sm text-gray-600">選擇贈品</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      showReview
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    3
                  </div>
                  <span className="ml-2 text-sm text-gray-600">確認訂單</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {currentStepItems.map((item) => renderQuestion(item))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex space-x-4">
            {currentStep === 2 && (
              <button
                type="button"
                onClick={onStepBack}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                上一步
              </button>
            )}
            <button
              type="submit"
              className={`${
                currentStep === 2 ? "flex-1" : "w-full"
              } px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
            >
              {currentStep === 2 ? "確認訂單" : "下一步"}
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
                <p className="text-sm text-gray-600">總計</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${total.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {Object.entries(formValues).reduce(
                    (count: number, [fieldName, value]) => {
                      // Extract question ID from field name (format: "question_<questionId>")
                      const questionIdMatch = fieldName.match(
                        /^question_(.+?)(?:_row_\d+_col_\d+)?$/
                      );
                      if (questionIdMatch) {
                        const questionId = questionIdMatch[1];
                        // Skip text questions
                        if (textQuestionIds.has(questionId)) {
                          return count;
                        }
                      }
                      // Count non-text fields
                      if (Array.isArray(value)) {
                        return count + value.length;
                      }
                      return count + (value ? 1 : 0);
                    },
                    0
                  )}{" "}
                  個已選擇的項目
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  );
}
