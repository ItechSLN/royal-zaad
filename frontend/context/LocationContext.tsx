'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

/**
 * The customer's chosen shopping location. It lives only in this browser
 * (localStorage) and is sent to the API solely as search query parameters —
 * never stored server-side. Everything works without one.
 */
export type LocationSource = "gps" | "lookup" | "address";

export type CustomerLocation = {
  lat: number;
  lng: number;
  label: string;
  source: LocationSource;
};

const STORAGE_KEY = "rz.location";
const listeners = new Set<() => void>();

const isValid = (value: unknown): value is CustomerLocation => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lat === "number" &&
    typeof v.lng === "number" &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng) &&
    Math.abs(v.lat) <= 90 &&
    Math.abs(v.lng) <= 180 &&
    typeof v.label === "string" &&
    (v.source === "gps" || v.source === "lookup" || v.source === "address")
  );
};

// Snapshots must be referentially stable between reads, so the parsed value is
// cached against the raw string it came from.
let cachedRaw: string | null = null;
let cachedValue: CustomerLocation | null = null;
// Fallback when storage is unavailable (private mode, blocked site data).
let memoryValue: CustomerLocation | null = null;
let storageWorks = true;

const read = (): CustomerLocation | null => {
  if (!storageWorks) return memoryValue;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    cachedValue = isValid(parsed) ? parsed : null;
    return cachedValue;
  } catch {
    storageWorks = false;
    return memoryValue;
  }
};

const write = (value: CustomerLocation | null) => {
  memoryValue = value;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    storageWorks = false;
  }
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const subscribeNever = () => () => {};

type LocationContextValue = {
  location: CustomerLocation | null;
  /** False during the server render and hydration, before the saved location is known. */
  ready: boolean;
  setLocation: (location: CustomerLocation) => void;
  clearLocation: () => void;
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  // The server render has no location; the client picks it up after hydration.
  const location = useSyncExternalStore(subscribe, read, () => null);
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);

  const setLocation = useCallback((next: CustomerLocation) => {
    write({
      lat: Math.round(next.lat * 1e4) / 1e4,
      lng: Math.round(next.lng * 1e4) / 1e4,
      label: next.label.slice(0, 120),
      source: next.source,
    });
  }, []);
  const clearLocation = useCallback(() => write(null), []);

  const value = useMemo(
    () => ({ location, ready, setLocation, clearLocation }),
    [location, ready, setLocation, clearLocation]
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useCustomerLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useCustomerLocation must be used within a LocationProvider");
  }
  return context;
}
