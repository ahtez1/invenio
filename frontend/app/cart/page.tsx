"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading, updateItem, removeItem, refreshCart } = useCart();
  const router = useRouter();
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <p className="text-muted">Log in to see your cart.</p>
        <Link href="/login" className="text-brand font-medium">
          Log in
        </Link>
      </div>
    );
  }

  async function handleCheckout() {
    setError("");
    setCheckingOut(true);
    try {
      const response = await api.post("/api/orders/orders/checkout/");
      await refreshCart();
      router.push(`/checkout/${response.data.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string; detail?: string }>;
      setError(axiosErr.response?.data?.error || axiosErr.response?.data?.detail || "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Your cart</h1>

      {loading ? (
        <p className="text-sm text-muted">Loading cart...</p>
      ) : !cart || cart.items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted">Your cart is empty.</p>
          <Link href="/" className="text-brand font-medium">
            Browse events
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border border-y border-border">
            {cart.items.map((item) => (
              <li key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{item.ticket.event_title}</p>
                  <p className="text-sm text-muted">
                    {item.ticket.ticket_type} · ${item.ticket.price}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, Number(e.target.value))}
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <p className="w-16 text-right text-sm font-medium">${item.line_total}</p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-sm text-muted hover:text-red-600 transition-colors"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${cart.total_price}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="w-full rounded-full bg-brand text-white font-medium py-3 hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {checkingOut ? "Preparing checkout..." : "Checkout"}
          </button>
        </>
      )}
    </div>
  );
}
