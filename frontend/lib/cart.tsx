"use client";

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";

import { api } from "./api";
import { Cart } from "./types";
import { useAuth } from "./auth";

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addItem: (ticketId: number, quantity: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<Cart>("/api/orders/cart/");
      setCart(response.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  async function addItem(ticketId: number, quantity: number) {
    await api.post("/api/orders/cart-items/", { ticket_id: ticketId, quantity });
    await refreshCart();
  }

  async function updateItem(itemId: number, quantity: number) {
    await api.patch(`/api/orders/cart-items/${itemId}/`, { quantity });
    await refreshCart();
  }

  async function removeItem(itemId: number) {
    await api.delete(`/api/orders/cart-items/${itemId}/`);
    await refreshCart();
  }

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{ cart, itemCount, loading, refreshCart, addItem, updateItem, removeItem }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
