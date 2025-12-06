import React, { useState, useRef } from "react";
import type { Image as FormImage } from "@/types/googleForms";
import SelectedProducts from "./SelectedProducts";
import { useDebounce } from "@/hooks/useDebounce";

interface Product {
  name: string;
  price: number;
  image?: FormImage;
}

interface ReviewProps {
  selectedProducts: Product[];
  selectedGifts?: Product[];
  onReviewSubmit: () => void;
  onReviewCancel: () => void;
  isSubmitting?: boolean;
}

export default function Review({
  selectedProducts,
  selectedGifts = [],
  onReviewSubmit,
  onReviewCancel,
  isSubmitting = false,
}: ReviewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const isSubmittingRef = useRef(false);

  const performSubmit = async () => {
    // Immediately prevent double clicks using ref (synchronous check)
    if (isSubmitting || isProcessing || isSubmittingRef.current) return;

    // Set ref immediately to prevent any subsequent clicks
    isSubmittingRef.current = true;
    // Set processing state immediately to disable button and show spinner
    setIsProcessing(true);

    try {
      await onReviewSubmit();
      // Note: isSubmitting from parent will handle the final state
      // Don't reset here - let DynamicForm handle success/error
    } catch {
      // Error is handled in DynamicForm, just reset processing state
      setIsProcessing(false);
      isSubmittingRef.current = false;
    }
  };

  // Debounce the submit handler to prevent rapid clicks
  const debouncedSubmit = useDebounce(performSubmit, 300);

  const handleSubmit = () => {
    // Check if already processing
    if (isSubmitting || isProcessing || isSubmittingRef.current) return;

    // Use debounced submit to prevent rapid clicks
    debouncedSubmit();
  };

  const isLoading = isSubmitting || isProcessing;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">確認您的訂單</h2>

      <SelectedProducts
        products={selectedProducts}
        gifts={selectedGifts}
        onReviewCancel={onReviewCancel}
      />

      {(selectedProducts.length > 0 || selectedGifts.length > 0) && (
        <div className="flex space-x-4 mt-6">
          <button
            type="button"
            onClick={onReviewCancel}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一頁
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                提交中...
              </>
            ) : (
              "提交"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
