'use client';

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import ActionBar, { type ActionButton, type ActionFilter } from "./ActionBar";
import KpiCard, { type DeltaTone } from "./KpiCard";

export type ScreenKpi = {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  deltaTone?: DeltaTone;
  note?: string;
};

/** Common admin screen scaffold: action sheet, optional status tabs, KPI row, body. */
export default function AdminScreen({
  title,
  subtitle,
  filters,
  actions,
  tabs,
  activeTab,
  onTabChange,
  kpis,
  children,
}: {
  title: string;
  subtitle: string;
  filters?: ActionFilter[];
  actions?: ActionButton[];
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  kpis?: ScreenKpi[];
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar title={title} subtitle={subtitle} filters={filters} actions={actions} />

      {tabs && tabs.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange?.(t)}
              className={`px-4 pb-3 font-body text-[12px] font-semibold transition ${
                activeTab === t
                  ? "border-b-2 border-[var(--gold)] text-[var(--ink)]"
                  : "border-b-2 border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
