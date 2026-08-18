import Image from "next/image";
import Link from "next/link";

import { mediaUrl } from "@/lib/api";
import { EventSummary } from "@/lib/types";

function formatDate(dateStr: string, timeStr: string) {
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function EventCard({ event }: { event: EventSummary }) {
  const cover = mediaUrl(event.cover_image);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block rounded-2xl overflow-hidden border border-border bg-surface hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-background">
        {cover ? (
          <Image
            src={cover}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted text-sm">
            No image yet
          </div>
        )}
      </div>
      <div className="p-4 space-y-1">
        <p className="text-xs font-semibold text-brand uppercase tracking-wide">
          {formatDate(event.date, event.time)}
        </p>
        <h3 className="font-semibold leading-snug line-clamp-2">{event.title}</h3>
        <p className="text-sm text-muted line-clamp-1">{event.location}</p>
        <p className="text-sm font-medium pt-1">
          {event.min_ticket_price ? `From $${event.min_ticket_price}` : "Free"}
        </p>
      </div>
    </Link>
  );
}
