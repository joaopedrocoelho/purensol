import React from "react";
import type { Image as FormImage } from "@/types/googleForms";
import SelectedProducts from "./SelectedProducts";

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
      )}
    </div>
  );
}
