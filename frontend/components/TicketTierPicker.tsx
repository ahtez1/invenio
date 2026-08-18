"use client";

import { useState } from "react";

import { Ticket } from "@/lib/types";

export default function TicketTierPicker({
  ticket,
  onAdd,
}: {
  ticket: Ticket;
  onAdd: (ticketId: number, quantity: number) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const soldOut = ticket.quantity_available <= 0;

  async function handleAdd() {
    setBusy(true);
    setAdded(false);
    try {
      await onAdd(ticket.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
      <div>
        <p className="font-semibold">{ticket.ticket_type}</p>
        <p className="text-sm text-muted">
          ${ticket.price} · {soldOut ? "Sold out" : `${ticket.quantity_available} left`}
        </p>
      </div>
      {!soldOut && (
        <div className="flex items-center gap-2">
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          >
            {Array.from({ length: Math.min(10, ticket.quantity_available) }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              )
            )}
          </select>
          <button
            onClick={handleAdd}
            disabled={busy}
            className="rounded-full bg-brand text-white text-sm font-medium px-4 py-1.5 hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {added ? "Added ✓" : busy ? "Adding..." : "Add to cart"}
          </button>
        </div>
      )}
    </div>
  );
}
