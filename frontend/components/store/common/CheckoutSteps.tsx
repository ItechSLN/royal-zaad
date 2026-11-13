/** The five-step bag → done rail used across SF-05 to SF-08. */
const STEPS = ["Bag", "Information", "Delivery", "Payment", "Done"];

export default function CheckoutSteps({
  current,
  onDark = false,
}: {
  /** 1-based index of the active step. */
  current: number;
  onDark?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-[22px] w-[22px] items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
                  active
                    ? "bg-[var(--gold)] text-[var(--noir)]"
                    : done
                      ? "bg-[var(--ink)] text-[var(--gold)]"
                      : onDark
                        ? "border border-[var(--hairline)] text-[var(--text-muted-dark)]"
                        : "border border-[var(--border-strong)] text-[var(--ink-muted)]"
                }`}
              >
                {n}
              </span>
              <span
                className={`font-body text-[11.5px] ${
                  active
                    ? onDark
                      ? "font-semibold text-[var(--cream)]"
                      : "font-semibold text-[var(--ink)]"
                    : onDark
                      ? "text-[var(--text-muted-dark)]"
                      : "text-[var(--ink-muted)]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={`h-px w-6 ${onDark ? "bg-[var(--hairline)]" : "bg-[var(--border-strong)]"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
