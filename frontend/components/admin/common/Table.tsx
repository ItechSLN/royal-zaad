import type { ReactNode } from "react";

/** Admin table primitives — cream header strip, hairline rows, 9.5px tracked caps. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-[var(--border-strong)] bg-[var(--admin-bg)]">
      {children}
    </thead>
  );
}

export function TH({
  children = null,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const alignment =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-3 py-[10px] font-body text-[9.5px] font-bold uppercase tracking-[1.1px] text-[var(--ink-muted)] ${alignment} ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  highlight = false,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <tr
      className={`border-b border-[var(--border)] transition last:border-b-0 hover:bg-[var(--admin-bg)] ${
        highlight ? "bg-[#FBF8F1]" : ""
      }`}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  strong = false,
  mono = false,
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  strong?: boolean;
  mono?: boolean;
  className?: string;
}) {
  const alignment =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td
      className={`px-3 py-[12px] ${mono ? "font-mono" : "font-body"} text-[11.5px] ${
        strong ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-muted)]"
      } ${alignment} ${className}`}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-3 py-10 text-center font-body text-[12px] text-[var(--ink-muted)]"
      >
        {children}
      </td>
    </tr>
  );
}
