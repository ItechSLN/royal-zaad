"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { createReview } from "@/services/store-reviews.service";

export default function ReviewForm({ productId, onSuccess }: { productId: string; onSuccess: () => void }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createReview({ productId, rating, title: title || undefined, content: content || undefined });
      toast.success("Thanks for your review!");
      setRating(0);
      setTitle("");
      setContent("");
      onSuccess();
    } catch (err: any) {
      setError(err?.errors?.productId || err?.message || "Unable to submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Your Rating</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => {
            const value = i + 1;
            const filled = value <= (hoverRating || rating);
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${value} stars`}
              >
                <Star size={22} className={filled ? "fill-amber-400 text-amber-400" :"fill-slate-200 text-slate-200"} />
              </button>
            );
          })}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Review title (optional)"
        className="w-full rounded-[2px] border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thoughts about this product..."
        rows={3}
        className="w-full rounded-[2px] border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
      />

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting..." :"Submit Review"}
      </button>
    </form>
  );
}
