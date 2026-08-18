"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { Order } from "@/lib/types";
import StripeCheckoutForm from "@/components/StripeCheckoutForm";

type PayResult =
  | { mode: "fake"; order: Order }
  | { mode: "live"; client_secret: string };

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order>(`/api/orders/orders/${id}/`)
      .then((r) => {
        setOrder(r.data);
        if (r.data.status === "paid") setPaid(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function startPayment() {
    setError("");
    try {
      const response = await api.post<PayResult>(`/api/orders/orders/${id}/pay/`);
      setPayResult(response.data);
      if (response.data.mode === "fake") setPaid(true);
    } catch {
      setError("Could not start payment.");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-sm text-muted">Loading order...</div>;
  }

  if (!order) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-sm text-muted">Order not found.</div>;
  }

  if (paid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">You&apos;re all set 🎉</h1>
        <p className="text-muted">Order #{order.id} is confirmed. A receipt was sent to your email.</p>
        <Link
          href="/tickets"
          className="inline-block rounded-full bg-brand text-white font-medium px-6 py-2.5 hover:bg-brand-dark transition-colors"
        >
          View my tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="rounded-xl border border-border p-4 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.quantity} × {item.ticket_type} - {item.event_title}
            </span>
            <span>${(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold pt-2 border-t border-border">
          <span>Total</span>
          <span>${order.total}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!payResult && (
        <button
          onClick={startPayment}
          className="w-full rounded-full bg-brand text-white font-medium py-3 hover:bg-brand-dark transition-colors"
        >
          Pay ${order.total}
        </button>
      )}

      {payResult && payResult.mode === "live" && (
        <StripeCheckoutForm
          clientSecret={payResult.client_secret}
          onSuccess={() => {
            setPaid(true);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
