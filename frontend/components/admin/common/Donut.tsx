/** Ring chart for share-of-total breakdowns (AD-01 "Sales by category"). */
const PALETTE = [
  "var(--gold)",
  "var(--amber)",
  "var(--ink)",
  "var(--ink-muted)",
  "var(--border-strong)",
  "var(--gold-deep)",
];

export default function Donut({
  data,
  size = 150,
  thickness = 26,
}: {
  data: { label: string; value: number }[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </g>
      </svg>

      <div className="flex min-w-[160px] flex-1 flex-col gap-[9px]">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-[9px]">
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-[1px]"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 font-body text-[11.5px] text-[var(--ink)]">{d.label}</span>
            <span className="font-body text-[11.5px] font-semibold text-[var(--ink)]">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
