"use client";

import { useEffect, useRef, useState } from "react";

type Settled<T> = { key: string; data: T; error: null } | { key: string; data: null; error: unknown };

/**
 * Runs `fetcher` whenever `key` changes and exposes the latest result for that
 * key. Loading is derived (the settled key differs from the current one), so
 * no state is set synchronously inside the effect and stale responses from an
 * earlier key are ignored. Pass `null` as the key to skip the request.
 */
export function useKeyedRequest<T>(key: string | null, fetcher: () => Promise<T>) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [reloads, setReloads] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestKey = key === null ? null : `${key}#${reloads}`;

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ key: requestKey, data, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setSettled({ key: requestKey, data: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const current = settled && settled.key === requestKey ? settled : null;
  return {
    loading: requestKey !== null && current === null,
    data: current?.data ?? null,
    error: current?.error ?? null,
    reload: () => setReloads((n) => n + 1),
  };
}

/** HTTP status of an ApiError-like rejection, if any. */
export const statusOf = (error: unknown) =>
  error && typeof error === "object" && "status" in error ? Number((error as { status: unknown }).status) : null;
