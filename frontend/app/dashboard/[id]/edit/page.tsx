"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { api, mediaUrl } from "@/lib/api";
import { EventDetail, Ticket } from "@/lib/types";

const TICKET_TYPES = ["Regular", "VIP", "VVIP"];

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [newTicket, setNewTicket] = useState({ ticket_type: "Regular", price: "", quantity_available: "" });
  const [ticketError, setTicketError] = useState("");

  const [uploading, setUploading] = useState(false);

  function loadEvent() {
    return api.get<EventDetail>(`/api/events/events/${id}/`).then((r) => {
      setEvent(r.data);
      setForm({
        title: r.data.title,
        description: r.data.description,
        date: r.data.date,
        time: r.data.time,
        location: r.data.location,
      });
    });
  }

  useEffect(() => {
    loadEvent().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api.patch(`/api/events/events/${id}/`, form);
      setSaved(true);
    } catch {
      setError("You may not have permission to edit this event, or the request failed.");
    }
  }

  async function handleAddTicket(e: React.FormEvent) {
    e.preventDefault();
    setTicketError("");
    try {
      await api.post(`/api/events/events/${id}/tickets/`, {
        ticket_type: newTicket.ticket_type,
        price: newTicket.price,
        quantity_available: newTicket.quantity_available,
      });
      setNewTicket({ ticket_type: "Regular", price: "", quantity_available: "" });
      await loadEvent();
    } catch {
      setTicketError("Could not add ticket tier (it may already exist for this event).");
    }
  }

  async function handleDeleteTicket(ticket: Ticket) {
    await api.delete(`/api/events/events/${id}/tickets/${ticket.id}/`);
    await loadEvent();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append("image", file);
    try {
      await api.post(`/api/events/events/${id}/images/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadEvent();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteImage(imageId: number) {
    await api.delete(`/api/events/events/${id}/images/${imageId}/`);
    await loadEvent();
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted">Loading...</div>;
  }

  if (!event) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted">Event not found.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage event</h1>
        <button onClick={() => router.push(`/events/${id}`)} className="text-sm text-brand font-medium">
          View public page →
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="font-semibold">Details</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-28 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-full bg-brand text-white font-medium px-6 py-2 hover:bg-brand-dark transition-colors"
        >
          Save details
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="font-semibold">Ticket tiers</h2>
        {event.tickets.length > 0 && (
          <ul className="divide-y divide-border border-y border-border">
            {event.tickets.map((ticket) => (
              <li key={ticket.id} className="py-3 flex items-center justify-between">
                <span className="text-sm">
                  {ticket.ticket_type} - ${ticket.price} ({ticket.quantity_available} available)
                </span>
                <button
                  onClick={() => handleDeleteTicket(ticket)}
                  className="text-sm text-muted hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddTicket} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Type</label>
            <select
              value={newTicket.ticket_type}
              onChange={(e) => setNewTicket((t) => ({ ...t, ticket_type: e.target.value }))}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
            >
              {TICKET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={newTicket.price}
              onChange={(e) => setNewTicket((t) => ({ ...t, price: e.target.value }))}
              className="w-24 rounded-lg border border-border bg-surface px-2 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Quantity</label>
            <input
              type="number"
              min="0"
              required
              value={newTicket.quantity_available}
              onChange={(e) => setNewTicket((t) => ({ ...t, quantity_available: e.target.value }))}
              className="w-24 rounded-lg border border-border bg-surface px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-full border border-border font-medium px-4 py-2 text-sm hover:bg-background transition-colors"
          >
            Add tier
          </button>
        </form>
        {ticketError && <p className="text-sm text-red-600">{ticketError}</p>}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold">Photos</h2>
        <div className="grid grid-cols-3 gap-3">
          {event.images.map((image) => {
            const url = mediaUrl(image.image);
            return (
              <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                {url && <Image src={url} alt="" fill className="object-cover" />}
                <button
                  onClick={() => handleDeleteImage(image.id)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <label className="inline-block text-sm font-medium text-brand cursor-pointer">
          {uploading ? "Uploading..." : "+ Upload photo"}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}
