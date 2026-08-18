"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { EventDetail } from "@/lib/types";
import TicketTierPicker from "@/components/TicketTierPicker";
import ReviewList from "@/components/ReviewList";

function formatDateTime(dateStr: string, timeStr: string) {
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get<EventDetail>(`/api/events/events/${id}/`)
      .then((r) => setEvent(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAdd(ticketId: number, quantity: number) {
    if (!user) {
      router.push("/login");
      return;
    }
    await addItem(ticketId, quantity);
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-muted text-sm">Loading event...</div>;
  }

  if (notFound || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-muted">Event not found.</p>
        <Link href="/" className="text-brand font-medium">
          Back to events
        </Link>
      </div>
    );
  }

  const cover = mediaUrl(event.cover_image);
  const isOrganizer = user && user.id === event.organizer.id;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-10">
      <div>
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-background border border-border">
          {cover ? (
            <Image src={cover} alt={event.title} fill className="object-cover" priority />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted text-sm">
              No image yet
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-6">
          <div>
            <p className="text-brand font-semibold text-sm uppercase tracking-wide">
              {formatDateTime(event.date, event.time)}
            </p>
            <h1 className="text-3xl font-bold mt-1">{event.title}</h1>
            <p className="text-muted mt-1">{event.location}</p>
            <p className="text-sm text-muted mt-2">
              Hosted by{" "}
              <span className="font-medium text-foreground">
                {event.organizer.first_name || event.organizer.username}
              </span>
            </p>
            {isOrganizer && (
              <Link
                href={`/dashboard/${event.id}/edit`}
                className="inline-block mt-3 text-sm font-medium text-brand"
              >
                Manage this event →
              </Link>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">About this event</h2>
            <p className="text-sm whitespace-pre-line text-muted">{event.description}</p>
          </div>

          <ReviewList eventId={event.id} />
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Tickets</h2>
          {event.tickets.length === 0 ? (
            <p className="text-sm text-muted">No tickets available yet.</p>
          ) : (
            event.tickets.map((ticket) => (
              <TicketTierPicker key={ticket.id} ticket={ticket} onAdd={handleAdd} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
