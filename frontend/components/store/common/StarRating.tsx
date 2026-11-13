import { Star } from "lucide-react";

type StarRatingProps = {
  rating: number;
  count?: number;
  size?: number;
  showCount?: boolean;
};

export default function StarRating({ rating, count, size = 14, showCount = true }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < Math.round(rating);
          return (
            <Star
              key={i}
              size={size}
              className={
                filled
                  ? "fill-[var(--amber)] text-[var(--amber)]"
                  : "fill-[var(--cream-2)] text-[var(--cream-2)]"
              }
            />
          );
        })}
      </div>
      {showCount && count !== undefined && (
        <span className="font-body text-[11px] text-[var(--ink-muted)]">({count})</span>
      )}
    </div>
  );
}
