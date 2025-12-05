import React from "react";
import type { Image as FormImage } from "@/types/googleForms";
import { transformImageUrl } from "@/lib/transformImageUrl";

interface Product {
  name: string;
  price: number;
  image?: FormImage;
}

interface SelectedProductsProps {
  products: Product[];
  gifts?: Product[];
  onReviewCancel: () => void;
}

export default function SelectedProducts({
  products,
  gifts = [],
  onReviewCancel,
}: SelectedProductsProps) {
  if (products.length === 0 && gifts.length === 0) {
    return <NoProducts onReviewCancel={onReviewCancel} />;
  }

  const total = products.reduce((sum, product) => sum + product.price, 0);

  return (
    <div className="space-y-6">
      {/* Regular Products Section */}
      {products.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            已選擇的商品
          </h3>
          <div className="space-y-4 mb-6">
            {products.map((product, index) => (
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
              <span className="text-lg font-semibold text-gray-900">總計</span>
              <span className="text-2xl font-bold text-gray-900">
                ${total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Gifts Section */}
      {gifts.length > 0 && (
        <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            已選擇的贈品
          </h3>
          <div className="space-y-4">
            {gifts.map((gift, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-4 border border-yellow-200 rounded-lg bg-white"
              >
                {gift.image && (
                  <div className="shrink-0">
                    <img
                      src={transformImageUrl(
                        gift.image.contentUri,
                        gift.image.properties?.width || 100
                      )}
                      alt={gift.name}
                      width={gift.image.properties?.width || 100}
                      className="rounded-lg shadow-sm w-20 h-20 object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium truncate">
                    {gift.name}
                  </p>
                  <p className="text-yellow-700 text-sm font-semibold">免費</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const NoProducts = ({ onReviewCancel }: { onReviewCancel: () => void }) => {
  return (
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
  );
};
