"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { EventSummary, Paginated } from "@/lib/types";
import EventCard from "@/components/EventCard";

export default function HomePage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (location) params.location__icontains = location;

    api
      .get<Paginated<EventSummary>>("/api/events/events/", { params, signal: controller.signal })
      .then((response) => setEvents(response.data.results))
      .catch((err) => {
        if (err.name !== "CanceledError") setError("Could not load events. Is the backend running?");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search, location]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Find events worth going to
        </h1>
        <p className="text-muted max-w-xl">
          Browse what&apos;s happening, grab tickets, or host your own event in minutes.
        </p>
      </section>

      <section className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location..."
          className="sm:w-64 rounded-full border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <p className="text-muted text-sm">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-muted text-sm">No events found. Check back soon.</p>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </div>
  );
}
