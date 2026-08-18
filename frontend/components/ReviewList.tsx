"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Review } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm">
      {"★".repeat(rating)}
      <span className="text-border">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewList({ eventId }: { eventId: number }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Review[]>(`/api/events/events/${eventId}/reviews/`)
      .then((r) => setReviews(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const alreadyReviewed = user && reviews.some((r) => r.user.id === user.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/api/events/events/${eventId}/reviews/`, { rating, text });
      setText("");
      setRating(5);
      load();
    } catch {
      setError("Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Reviews</h2>

      {user && !alreadyReviewed && (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Your rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder="Share your thoughts..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand text-white text-sm font-medium px-4 py-1.5 hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {submitting ? "Posting..." : "Post review"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews yet.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {review.user.first_name || review.user.username}
                </span>
                <Stars rating={review.rating} />
              </div>
              <p className="text-sm text-muted mt-1">{review.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
