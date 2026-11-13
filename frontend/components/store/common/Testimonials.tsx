"use client";

import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import StarRating from "@/components/store/common/StarRating";
import SectionHeading from "@/components/store/common/SectionHeading";
import { getFeaturedReviews, Review } from "@/services/store-reviews.service";

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedReviews(3)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  // Only real, featured reviews — never invented testimonials.
  if (reviews.length === 0) return null;
  const shown = reviews;

  return (
    <section className="flex flex-col gap-[34px]">
      <div className="flex justify-center">
        <SectionHeading eyebrow="In their words" title="From the Zaad Table" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((review) => (
          <figure
            key={review.id}
            className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <Quote className="h-5 w-5 text-[var(--gold)]" fill="currentColor" />
            <StarRating rating={review.rating} showCount={false} size={13} />
            <blockquote className="flex-1 font-body text-[13px] leading-[1.8] text-[var(--ink-muted)]">
              {review.content}
            </blockquote>
            <figcaption className="font-body text-[12px] font-semibold text-[var(--ink)]">
              {review.customer.firstName} {review.customer.lastName.charAt(0)}.
              {review.product && (
                <span className="ml-1 font-normal text-[var(--ink-muted)]">
                  — {review.product.name}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
