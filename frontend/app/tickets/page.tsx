"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Order, Paginated } from "@/lib/types";

const statusStyles: Record<Order["status"], string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-stone-200 text-stone-600",
};

export default function TicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<Paginated<Order> | Order[]>("/api/orders/orders/")
      .then((r) => setOrders(Array.isArray(r.data) ? r.data : r.data.results))
      .finally(() => setLoading(false));
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <p className="text-muted">Log in to see your tickets.</p>
        <Link href="/login" className="text-brand font-medium">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">My tickets</h1>

      {loading ? (
        <p className="text-sm text-muted">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted">No orders yet.</p>
          <Link href="/" className="text-brand font-medium">
            Browse events
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Order #{order.id}</p>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[order.status]}`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-muted">
                Placed {new Date(order.placed_at).toLocaleDateString()}
              </p>
              <ul className="text-sm text-muted space-y-1">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.ticket_type} - {item.event_title}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold">${order.total}</span>
              </div>
              {order.status === "pending" && (
                <Link
                  href={`/checkout/${order.id}`}
                  className="inline-block text-sm font-medium text-brand"
                >
                  Complete payment →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
