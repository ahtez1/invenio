"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { Order } from "@/lib/types";

function formatDateTime(dateStr: string | null, timeStr: string | null) {
  if (!dateStr || !timeStr) return null;
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get<Order>(`/api/orders/orders/${id}/`)
      .then((r) => setOrder(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted">Loading tickets...</div>;
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 space-y-3">
        <p className="text-muted">Order not found.</p>
        <Link href="/tickets" className="text-brand font-medium">
          Back to my tickets
        </Link>
      </div>
    );
  }

  if (order.status !== "paid") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 space-y-3">
        <p className="text-muted">
          This order isn&apos;t paid yet, so there are no tickets to show.
        </p>
        <Link href={`/checkout/${order.id}`} className="text-brand font-medium">
          Complete payment →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-6">
      <div>
        <Link href="/tickets" className="text-sm text-muted hover:text-foreground transition-colors">
          ← My tickets
        </Link>
        <h1 className="text-2xl font-bold mt-2">Order #{order.id}</h1>
        <p className="text-sm text-muted">
          Placed {new Date(order.placed_at).toLocaleDateString()}
          {order.paid_at && ` · Paid ${new Date(order.paid_at).toLocaleDateString()}`}
        </p>
      </div>

      <div className="space-y-4">
        {order.items.flatMap((item) =>
          item.references.map((reference, index) => {
            const when = formatDateTime(item.event_date, item.event_time);
            const card = (
              <div className="rounded-2xl border border-border bg-surface overflow-hidden flex">
                <div className="flex-1 p-5 space-y-1.5">
                  <p className="text-xs font-semibold text-brand uppercase tracking-wide">
                    {item.ticket_type}
                    {item.quantity > 1 && ` · ${index + 1} of ${item.quantity}`}
                  </p>
                  <h2 className="font-semibold text-lg leading-snug">{item.event_title}</h2>
                  {when && <p className="text-sm text-muted">{when}</p>}
                  {item.event_location && (
                    <p className="text-sm text-muted">{item.event_location}</p>
                  )}
                  <p className="text-sm font-medium pt-1">${item.unit_price}</p>
                </div>
                <div className="w-32 shrink-0 border-l border-dashed border-border flex flex-col items-center justify-center gap-1 px-3 bg-background text-center">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">
                    Reference
                  </span>
                  <span className="text-xs font-mono break-all">{reference}</span>
                </div>
              </div>
            );
            return item.event_id ? (
              <Link key={reference} href={`/events/${item.event_id}`} className="block">
                {card}
              </Link>
            ) : (
              card
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
        <span className="font-medium">Total paid</span>
        <span className="font-semibold">${order.total}</span>
      </div>
    </div>
  );
}
