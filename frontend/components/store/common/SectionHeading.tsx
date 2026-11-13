import GoldRule from "@/components/ui/GoldRule";

/** Centred maison section heading — tracked eyebrow, display title, gold ornament. */
export default function SectionHeading({
  eyebrow,
  title,
  align = "center",
  onDark = false,
}: {
  eyebrow: string;
  title: string;
  align?: "center" | "left";
  onDark?: boolean;
}) {
  const centred = align === "center";
  return (
    <div className={`flex flex-col gap-[10px] ${centred ? "items-center" : "items-start"}`}>
      <p
        className={`font-body text-[10px] font-semibold tracking-[3px] ${
          onDark ? "text-[var(--gold)]" : "text-[var(--gold-deep)]"
        }`}
      >
        {eyebrow.toUpperCase()}
      </p>
      <h2
        className={`font-display text-[34px] leading-tight sm:text-[44px] ${
          onDark ? "text-[var(--cream)]" : "text-[var(--ink)]"
        } ${centred ? "text-center" : ""}`}
      >
        {title}
      </h2>
      <GoldRule className="mt-1" />
    </div>
  );
}
