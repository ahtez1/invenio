"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { EventSummary, Paginated } from "@/lib/types";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<Paginated<EventSummary>>("/api/events/events/mine/")
      .then((r) => setEvents(r.data.results))
      .finally(() => setLoading(false));
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <p className="text-muted">Log in to manage your events.</p>
        <Link href="/login" className="text-brand font-medium">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My events</h1>
        <Link
          href="/dashboard/create"
          className="rounded-full bg-brand text-white text-sm font-medium px-4 py-2 hover:bg-brand-dark transition-colors"
        >
          + Create event
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">You haven&apos;t created any events yet.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {events.map((event) => (
            <li key={event.id} className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-muted">
                  {event.date} · {event.location}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link href={`/events/${event.id}`} className="text-muted hover:text-foreground">
                  View
                </Link>
                <Link href={`/dashboard/${event.id}/edit`} className="text-brand font-medium">
                  Manage
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
