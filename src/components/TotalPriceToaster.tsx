import React from "react";
import { useCart } from "./CartContext";

export default function TotalPriceToaster() {
  const { total, selectedItemsCount } = useCart();

  return (
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
              {selectedItemsCount} 個已選擇的項目
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
