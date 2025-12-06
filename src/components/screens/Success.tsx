import React, { useEffect } from "react";
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
  // Scroll to top when success screen appears
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-green-800 mb-2">
          表單提交成功囉！
        </h2>
        <p className="text-green-700">
          請私訊官方Line(@purensoltw)，小幫手會盡快協助確認訂單內容♥︎
        </p>
      </div>

      <SelectedProducts
        products={selectedProducts}
        gifts={selectedGifts}
        onReviewCancel={() => {}}
      />
    </div>
  );
}
