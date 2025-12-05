import React from "react";
import type { Image as FormImage } from "@/types/googleForms";
import SelectedProducts from "./SelectedProducts";

interface Product {
  name: string;
  price: number;
  image?: FormImage;
}

interface SuccessProps {
  selectedProducts: Product[];
  selectedGifts?: Product[];
}

export default function Success({
  selectedProducts,
  selectedGifts = [],
}: SuccessProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-green-800 mb-2">
          表單提交成功！
        </h2>
        <p className="text-green-700">感謝您的提交。</p>
      </div>

      <SelectedProducts
        products={selectedProducts}
        gifts={selectedGifts}
        onReviewCancel={() => {}}
      />
    </div>
  );
}
