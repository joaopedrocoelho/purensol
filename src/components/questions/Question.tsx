import React from "react";
import { UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form";
import type { GoogleFormItem } from "@/types/googleForms";
import PageBreakItem from "./PageBreakItem";
import QuestionGroup from "./QuestionGroup";
import ChoiceQuestion from "./ChoiceQuestion";
import TextQuestion from "./TextQuestion";
import ScaleQuestion from "./ScaleQuestion";
import DateQuestion from "./DateQuestion";
import TimeQuestion from "./TimeQuestion";
import FileUploadQuestion from "./FileUploadQuestion";
import GridQuestion from "./GridQuestion";
import { transformImageUrl } from "@/lib/transformImageUrl";
import { calculateMaxGiftSelections } from "../gifts/useGiftSection";
import { isGiftSection } from "@/lib/utils";
import { getThresholds } from "../gifthreshold";

interface QuestionProps {
  item: GoogleFormItem;
  register: UseFormRegister<Record<string, string | string[] | number>>;
  errors: FieldErrors<Record<string, string | string[] | number>>;
  watch: UseFormWatch<Record<string, string | string[] | number>>;
  formValues: Record<string, string | string[] | number>;
  // Gift section props
  giftSections: Map<
    string,
    { thresholds: Array<{ amount: number; gifts: number }> }
  >;
  totalExcludingGift: number;
}

export default function Question({
  item,
  register,
  errors,
  watch,
  formValues,
  giftSections,
  totalExcludingGift,
}: QuestionProps) {
  // Handle page breaks
  if (item.pageBreakItem) {
    return <PageBreakItem key={item.itemId} item={item} />;
  }

  // Handle question groups with questions array (not grid)
  if (item.questionGroupItem?.questions && !item.questionGroupItem?.grid) {
    return (
      <QuestionGroup
        key={item.itemId}
        item={item}
        register={register}
        errors={errors}
        transformImageUrl={transformImageUrl}
      />
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

  // Check if this is a gift section (check both the item and the map)
  const isGiftItem = isGiftSection(item);
  const giftSectionData = giftSections.get(questionId);
  const isGiftSectionQuestion = !!giftSectionData || isGiftItem;

  // Get thresholds - from map if available, otherwise parse from item title
  const thresholds =
    giftSectionData?.thresholds ||
    (isGiftItem ? getThresholds(item.title) : []);

  // Watch the specific field to get real-time updates
  const watchedFieldValue = isGiftSectionQuestion
    ? watch(fieldName)
    : formValues[fieldName];
  const currentGiftSelections = isGiftSectionQuestion
    ? (watchedFieldValue as string[] | undefined)
    : undefined;
  const currentGiftCount = Array.isArray(currentGiftSelections)
    ? currentGiftSelections.length
    : 0;

  // Calculate max selections for this gift section
  const maxGiftSelections =
    isGiftSectionQuestion && thresholds.length > 0
      ? calculateMaxGiftSelections(totalExcludingGift, thresholds)
      : 0;
  const isGiftLimitReached =
    isGiftSectionQuestion && currentGiftCount >= maxGiftSelections;

  // Handle choice questions (radio, checkbox, dropdown)
  if (question.choiceQuestion) {
    return (
      <ChoiceQuestion
        key={item.itemId}
        item={item}
        question={question}
        fieldName={fieldName}
        isRequired={isRequired}
        register={register}
        errors={errors}
        isGiftSection={isGiftSectionQuestion}
        giftThresholds={thresholds}
        totalExcludingGift={totalExcludingGift}
        maxGiftSelections={maxGiftSelections}
        currentGiftCount={currentGiftCount}
        currentGiftSelections={currentGiftSelections}
        isGiftLimitReached={isGiftLimitReached}
      />
    );
  }

  // Handle text questions
  if (question.textQuestion) {
    return (
      <TextQuestion
        key={item.itemId}
        item={item}
        question={question}
        fieldName={fieldName}
        isRequired={isRequired}
        register={register}
        errors={errors}
      />
    );
  }

  // Handle scale questions
  if (question.scaleQuestion) {
    return (
      <ScaleQuestion
        key={item.itemId}
        item={item}
        question={question}
        fieldName={fieldName}
        isRequired={isRequired}
        register={register}
        errors={errors}
      />
    );
  }

  // Handle date questions
  if (question.dateQuestion) {
    return (
      <DateQuestion
        key={item.itemId}
        item={item}
        question={question}
        fieldName={fieldName}
        isRequired={isRequired}
        register={register}
        errors={errors}
      />
    );
  }

  // Handle time questions
  if (question.timeQuestion) {
    return (
      <TimeQuestion
        key={item.itemId}
        item={item}
        question={question}
        fieldName={fieldName}
        isRequired={isRequired}
        register={register}
        errors={errors}
      />
    );
  }

  // Handle file upload questions
  if (question.fileUploadQuestion) {
    return (
      <FileUploadQuestion
        key={item.itemId}
        item={item}
        question={question}
        fieldName={fieldName}
        isRequired={isRequired}
        register={register}
        errors={errors}
      />
    );
  }

  // Handle question groups (grid questions)
  if (item.questionGroupItem?.grid) {
    return (
      <GridQuestion
        key={item.itemId}
        item={item}
        register={register}
        errors={errors}
      />
    );
  }

  return null;
}
