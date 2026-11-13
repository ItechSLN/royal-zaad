'use client';

import { useState } from "react";
import { money } from "./ui";

type Day = { date: string; orders: number; sales: number };

const H = 180;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;

/** Round the axis max up to a readable step (1, 2, 5 × 10ⁿ). */
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Single-series daily bars: thin gold marks anchored to the baseline, a
 * recessive grid, a hover tooltip per day, and a screen-reader table.
 */
export default function SalesChart({ daily }: { daily: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...daily.map((d) => d.sales)));
  const n = daily.length || 1;
  const W = 640;
  const slot = W / n;
  const gap = Math.min(2, slot * 0.25);
  const barW = Math.max(1, slot - gap);
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;
  const labelEvery = Math.ceil(n / 6);
  const total = daily.reduce((s, d) => s + d.sales, 0);
  const active = hover !== null ? daily[hover] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex items-baseline justify-between font-body text-[11px] text-[var(--ink-muted)]">
        <span>Axis max {money(max)}</span>
        <span>
          {active ? (
            <>
              <strong className="text-[var(--ink)]">{shortDate(active.date)}</strong> · {money(active.sales)} ·{" "}
              {active.orders} order{active.orders === 1 ? "" : "s"}
            </>
          ) : (
            <>Total {money(total)}</>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[200px] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Daily sales over ${daily.length} days, total ${money(total)}`}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="var(--border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {daily.map((d, i) => {
          const top = y(d.sales);
          const h = PAD_TOP + plotH - top;
          return (
            <g key={d.date}>
              {/* Hit target: the whole day column, larger than the mark. */}
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={H - PAD_BOTTOM}
                fill={hover === i ? "var(--cream-2)" : "transparent"}
                onMouseEnter={() => setHover(i)}
              />
              {d.sales > 0 && (
                <rect
                  x={i * slot + gap / 2}
                  y={top}
                  width={barW}
                  height={Math.max(1, h)}
                  rx={Math.min(4, barW / 2)}
                  fill={hover === i ? "var(--ink)" : "var(--gold-deep)"}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between font-body text-[10px] text-[var(--ink-muted)]">
        {daily
          .filter((_, i) => i % labelEvery === 0 || i === daily.length - 1)
          .map((d) => (
            <span key={d.date}>{shortDate(d.date)}</span>
          ))}
      </div>
      <table className="sr-only">
        <caption>Daily sales</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Orders</th>
            <th>Sales</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.orders}</td>
              <td>{money(d.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
