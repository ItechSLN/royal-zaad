import BrandMark from "./BrandMark";

/**
 * The brand lockup: mark above the wordmark.
 *
 * `arabic` adds الزاد الملكي beneath the Latin name. It is set larger than the
 * Latin because Amiri's letterforms sit optically smaller than Cormorant's at
 * the same point size. Reserved for places with vertical room — the footer and
 * the auth panels — rather than the header bar.
 */
export default function BrandLockup({
  size = 40,
  arabic = false,
  tagline,
  tone = "dark",
  className = "",
}: {
  size?: number;
  arabic?: boolean;
  tagline?: string;
  /** `dark` = sitting on a dark ground; `light` = on cream. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const nameColour = tone === "dark" ? "text-[var(--cream)]" : "text-[var(--ink)]";

  return (
    <span className={`flex flex-col items-center gap-[6px] ${className}`}>
      <BrandMark size={size} className="text-[var(--gold)]" />

      <span className="flex flex-col items-center gap-[3px]">
        <span
          className={`font-display text-[22px] font-medium leading-none tracking-[6px] ${nameColour}`}
        >
          ROYAL ZAAD
        </span>

        {arabic && (
          <span
            lang="ar"
            dir="rtl"
            className={`font-arabic text-[23px] leading-none ${nameColour}`}
          >
            الزاد الملكي
          </span>
        )}

        {tagline && (
          <span className="font-body text-[7px] tracking-[2.6px] text-[var(--gold)]">
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
