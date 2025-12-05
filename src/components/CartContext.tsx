import React, { createContext, useContext, useState, ReactNode } from "react";

interface CartContextType {
  total: number;
  selectedItemsCount: number;
  setTotal: (total: number) => void;
  setSelectedItemsCount: (count: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [total, setTotal] = useState(0);
  const [selectedItemsCount, setSelectedItemsCount] = useState(0);

  return (
    <CartContext.Provider
      value={{
        total,
        selectedItemsCount,
        setTotal,
        setSelectedItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
