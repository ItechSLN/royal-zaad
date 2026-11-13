'use client';

import type { ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { EmptyRow } from "./Table";

/**
 * Loading / error / empty row for a live admin table. Returns null once there
 * are rows to show, so callers render `ListStateRow ?? rows`.
 */
export function listState({
  loading,
  live,
  count,
}: {
  loading: boolean;
  live: boolean;
  count: number;
}): "loading" | "error" | "empty" | null {
  if (!live) return loading ? "loading" : "error";
  return count === 0 ? "empty" : null;
}

export default function ListStateRow({
  colSpan,
  state,
  onRetry,
  empty,
  noun = "records",
}: {
  colSpan: number;
  state: "loading" | "error" | "empty";
  onRetry: () => void;
  empty: ReactNode;
  noun?: string;
}) {
  if (state === "loading") return <EmptyRow colSpan={colSpan}>Loading {noun}…</EmptyRow>;
  if (state === "empty") return <EmptyRow colSpan={colSpan}>{empty}</EmptyRow>;
  return (
    <EmptyRow colSpan={colSpan}>
      <span className="text-[var(--danger)]">Couldn&apos;t load {noun}.</span>{" "}
      <button
        type="button"
        onClick={onRetry}
        className="ml-2 inline-flex items-center gap-1 font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
      >
        <RotateCw size={12} /> Retry
      </button>
    </EmptyRow>
  );
}

/** Turns an API validation error into a sentence a person can act on. */
export const errorText = (error: any, fallback = "Something went wrong.") => {
  const fields = error?.errors ? Object.values(error.errors as Record<string, string>) : [];
  return fields.length ? fields.join(" ") : (error?.message ?? fallback);
};
