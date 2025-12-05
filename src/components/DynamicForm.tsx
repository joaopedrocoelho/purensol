import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import type {
  GoogleForm,
  GoogleFormItem,
  Image as FormImage,
} from "@/types/googleForms";
import { log } from "@/lib/log";
import { isSection } from "./issection";
import StepIndicator from "./StepIndicator";
import { useCart } from "./CartContext";
import TotalPriceToaster from "./TotalPriceToaster";
import Question from "./questions/Question";
import FormNavButtons from "./buttons/FormNavButtons";
import Review from "./screens/Review";
import Success from "./screens/Success";
import { extractPrice, hasQuestion, isGiftSection } from "@/lib/utils";
import FormHeader from "./FormHeader";
import {
  useGiftSections,
  calculateMaxGiftSelections,
} from "./gifts/useGiftSection";

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
  const { setTotal, setSelectedItemsCount } = useCart();

  // Watch all form values to calculate total
  const formValues = watch();

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

  // Find all gift sections dynamically
  const giftSections = useGiftSections(form.items);

  // Split form items into steps based on section headers (✦ x區 ✦) and gift sections
  const steps = useMemo(() => {
    const stepArrays: GoogleFormItem[][] = [];
    let currentStepItems: GoogleFormItem[] = [];

    form.items.forEach((item) => {
      const isSectionHeader = item.title ? isSection(item.title) : false;
      const isGift = isGiftSection(item);

      // Gift sections are their own steps
      if (isGift) {
        // Save current step if it has items
        if (currentStepItems.length > 0) {
          const hasQuestions = currentStepItems.some(
            (i) =>
              hasQuestion(i) && !isSection(i.title || "") && !isGiftSection(i)
          );
          if (hasQuestions) {
            stepArrays.push([...currentStepItems]);
          }
          currentStepItems = [];
        }
        // Gift section is its own step
        stepArrays.push([item]);
      } else if (isSectionHeader) {
        // If we have accumulated items with questions, save them as a step
        if (currentStepItems.length > 0) {
          // Only add step if it has at least one question item (not just section headers)
          const hasQuestions = currentStepItems.some(
            (i) =>
              hasQuestion(i) && !isSection(i.title || "") && !isGiftSection(i)
          );
          if (hasQuestions) {
            stepArrays.push([...currentStepItems]);
          }
          currentStepItems = [];
        }
        // Start a new step with this section header
        currentStepItems.push(item);
      } else {
        // Add item to current step
        currentStepItems.push(item);
      }
    });

    // Don't forget the last step
    if (currentStepItems.length > 0) {
      // Only add step if it has at least one question item (not just section headers)
      const hasQuestions = currentStepItems.some(
        (i) => hasQuestion(i) && !isSection(i.title || "") && !isGiftSection(i)
      );
      if (hasQuestions) {
        stepArrays.push(currentStepItems);
      }
    }

    // If no sections found, put all items in one step
    if (stepArrays.length === 0) {
      stepArrays.push([...form.items]);
    }

    return stepArrays;
  }, [form.items]);

  // Total number of form steps (excluding review step)
  const totalFormSteps = steps.length;

  // Get items for a specific step (1-indexed)
  const getStepItems = (stepNumber: number): GoogleFormItem[] => {
    if (stepNumber < 1 || stepNumber > totalFormSteps) {
      return [];
    }
    return steps[stepNumber - 1] || [];
  };

  // Create a simplified map of gift sections for Question component
  const giftSectionsMap = useMemo(() => {
    const map = new Map<
      string,
      { thresholds: Array<{ amount: number; gifts: number }> }
    >();
    giftSections.forEach((data, questionId) => {
      map.set(questionId, { thresholds: data.thresholds });
    });
    return map;
  }, [giftSections]);

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

      // Skip all gift sections in this calculation
      if (giftSections.has(questionId)) return;

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
  }, [formValues, questionPriceMap, optionPriceMap, giftSections]);

  // Calculate total including everything (for display)
  const total = useMemo(() => {
    const sum = totalExcludingGift;

    // Gift items don't have prices, so they don't add to total
    // But we still count them for the selection limit

    return sum;
  }, [totalExcludingGift]);

  // Enforce gift selection limits for all gift sections
  useEffect(() => {
    giftSections.forEach((giftData, questionId) => {
      const maxSelections = calculateMaxGiftSelections(
        totalExcludingGift,
        giftData.thresholds
      );
      const giftFieldName = `question_${questionId}`;
      const currentSelections = formValues[giftFieldName] as
        | string[]
        | undefined;

      if (
        Array.isArray(currentSelections) &&
        currentSelections.length > maxSelections
      ) {
        // Trim selections to max allowed (keep the first N selections)
        const trimmed = currentSelections.slice(0, maxSelections);
        setValue(giftFieldName, trimmed, {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    });
  }, [giftSections, totalExcludingGift, setValue, formValues]);

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

  // Update cart context when total or formValues change
  useEffect(() => {
    setTotal(total);

    // Calculate selected items count
    const count = Object.entries(formValues).reduce(
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
    );
    setSelectedItemsCount(count);
  }, [total, formValues, textQuestionIds, setTotal, setSelectedItemsCount]);

  // Extract selected products from review data (excluding gifts)
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
      if (textQuestionIds.has(questionId) || giftSections.has(questionId)) {
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
    giftSections,
    optionPriceMap,
    questionPriceMap,
    optionImageMap,
    questionItemImageMap,
  ]);

  // Extract selected gifts from review data
  const getSelectedGifts = useMemo(() => {
    if (!reviewData) return [];

    const gifts: Array<{
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

      // Only process gift sections
      if (!giftSections.has(questionId)) {
        return;
      }

      // Handle array values (checkboxes)
      if (Array.isArray(value)) {
        value.forEach((optionValue) => {
          if (typeof optionValue === "string" && optionValue.trim() !== "") {
            const optionImage = optionImageMap.get(optionValue);
            const itemImage = questionItemImageMap.get(questionId);
            gifts.push({
              name: optionValue,
              price: 0, // Gifts are free
              image: optionImage || itemImage,
            });
          }
        });
      } else if (value) {
        // Handle single selection (radio or single checkbox)
        if (typeof value === "string" && value.trim() !== "") {
          const optionImage = optionImageMap.get(value);
          const itemImage = questionItemImageMap.get(questionId);
          gifts.push({
            name: value,
            price: 0, // Gifts are free
            image: optionImage || itemImage,
          });
        }
      }
    });

    return gifts;
  }, [reviewData, giftSections, optionImageMap, questionItemImageMap]);

  const onFormNext = async (data: FormValues) => {
    // Validate only current step's fields
    const itemsToValidate = getStepItems(currentStep);
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

    if (currentStep < totalFormSteps) {
      // Move to next step
      setCurrentStep(currentStep + 1);
    } else if (currentStep === totalFormSteps) {
      // Move to review step
      setReviewData(data);
      setShowReview(true);
    }
  };

  const onStepBack = () => {
    if (showReview) {
      setShowReview(false);
      setReviewData(null);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
    setCurrentStep(totalFormSteps);
  };

  // Review screen - shows before submission
  if (showReview && !submitted) {
    return (
      <Review
        selectedProducts={getSelectedProducts}
        selectedGifts={getSelectedGifts}
        onReviewSubmit={onReviewSubmit}
        onReviewCancel={onReviewCancel}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Success screen - shows after submission
  if (submitted) {
    return (
      <Success
        selectedProducts={getSelectedProducts}
        selectedGifts={getSelectedGifts}
      />
    );
  }

  // Get items for current step
  const currentStepItems = getStepItems(currentStep);

  return (
    <>
      <form
        onSubmit={handleSubmit(onFormNext)}
        className={`max-w-2xl mx-auto ${total > 0 ? "pb-24" : ""}`}
      >
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <FormHeader form={form} currentStep={currentStep} />

          {/* Step indicator */}
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            totalFormSteps={totalFormSteps}
            showReview={showReview}
          />

          <div className="space-y-4">
            {currentStepItems.map((item) => (
              <Question
                key={item.itemId}
                item={item}
                register={register}
                errors={errors}
                watch={watch}
                formValues={formValues}
                giftSections={giftSectionsMap}
                totalExcludingGift={totalExcludingGift}
              />
            ))}
          </div>

          <FormNavButtons
            currentStep={currentStep}
            totalFormSteps={totalFormSteps}
            onStepBack={onStepBack}
            onNextStep={() => handleSubmit(onFormNext)()}
          />
        </div>
      </form>

      {/* Total Price Toaster */}
      <TotalPriceToaster />
    </>
  );
}
