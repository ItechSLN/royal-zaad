"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Home, Loader2, MapPin, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCustomerLocation } from "@/context/LocationContext";
import { getMyAddresses, type Address } from "@/services/store-addresses.service";
import { lookupPlace } from "@/services/store-marketplace.service";

type AddressState =
  | { status: "idle" | "loading" }
  | { status: "ready"; addresses: Address[] }
  | { status: "error" };

const GEO_ERRORS: Record<number, string> = {
  1: "Location access was denied. Type a postcode or city instead.",
  2: "Your location couldn't be determined. Type a postcode or city instead.",
  3: "Finding your location took too long. Try again, or type a postcode or city.",
};

/**
 * Header control for the customer's shopping location: the browser's
 * position (only after the user asks), a typed postcode/city/area geocoded by
 * the API, or one of the customer's saved addresses.
 */
export default function LocationPicker() {
  const { user } = useAuth();
  const { location, setLocation, clearLocation } = useCustomerLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"gps" | "lookup" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<AddressState>({ status: "idle" });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setMessage(null);
    // Saved addresses load when the panel is opened by a signed-in customer.
    if (next && user && addresses.status !== "ready") {
      setAddresses({ status: "loading" });
      getMyAddresses()
        .then((list) => setAddresses({ status: "ready", addresses: list }))
        .catch(() => setAddresses({ status: "error" }));
    }
  };

  const useMyLocation = () => {
    setMessage(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessage("This browser can't share its location. Type a postcode or city instead.");
      return;
    }
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Current location",
          source: "gps",
        });
        setBusy(null);
        setOpen(false);
      },
      (err) => {
        setBusy(null);
        setMessage(GEO_ERRORS[err.code] ?? "Your location couldn't be determined.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy("lookup");
    setMessage(null);
    try {
      const result = await lookupPlace(q);
      setLocation({ lat: result.latitude, lng: result.longitude, label: result.label || q, source: "lookup" });
      setQuery("");
      setOpen(false);
    } catch (err) {
      const api = err as { errors?: Record<string, string>; message?: string; status?: number };
      setMessage(
        api?.errors?.q ||
          (api?.status === 429 ? api.message : null) ||
          "We couldn't find that place. Try a postcode or a nearby city."
      );
    } finally {
      setBusy(null);
    }
  };

  const pickAddress = (a: Address) => {
    if (a.latitude == null || a.longitude == null) return;
    setLocation({
      lat: a.latitude,
      lng: a.longitude,
      label: a.label || `${a.city}${a.postalCode ? ` ${a.postalCode}` : ""}`,
      source: "address",
    });
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={location ? `Shopping near ${location.label}. Change location` : "Set your location"}
        className="flex max-w-[180px] items-center gap-[6px] text-[var(--text-on-dark)] transition hover:text-[var(--gold)]"
      >
        <MapPin size={16} className={location ? "text-[var(--gold)]" : ""} />
        <span className="hidden truncate font-body text-[11px] tracking-[0.4px] xl:inline">
          {location ? location.label : "Set location"}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose your location"
          className="absolute right-0 z-50 mt-3 w-[300px] max-w-[calc(100vw-32px)] rounded-[2px] border border-[var(--hairline)] bg-[var(--charcoal)] p-4 text-left shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="font-body text-[10px] font-bold tracking-[1.6px] text-[var(--gold)]">
                SHOPPING NEAR
              </p>
              <p className="font-body text-[12.5px] text-[var(--text-on-dark)]">
                {location ? location.label : "No location set"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-[var(--text-muted-dark)] transition hover:text-[var(--cream)]"
            >
              <X size={14} />
            </button>
          </div>

          <p className="mt-2 font-body text-[10.5px] leading-[1.6] text-[var(--text-muted-dark)]">
            Used to show nearby shops and delivery options. It stays in this browser.
          </p>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={busy !== null}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[2px] border border-[var(--gold)] px-3 py-[9px] font-body text-[11px] font-semibold tracking-[0.8px] text-[var(--gold)] transition hover:bg-[var(--gold)]/10 disabled:opacity-50"
          >
            {busy === "gps" ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
            Use my location
          </button>

          <form onSubmit={lookup} className="mt-3 flex items-center gap-2">
            <label htmlFor="location-query" className="sr-only">
              Postcode, city or area
            </label>
            <input
              id="location-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Postcode, city or area"
              maxLength={120}
              className="min-w-0 flex-1 rounded-[2px] border border-[var(--hairline)] bg-transparent px-3 py-[9px] font-body text-[12px] text-[var(--text-on-dark)] outline-none placeholder:text-[var(--text-muted-dark)] focus:border-[var(--gold)]"
            />
            <button
              type="submit"
              disabled={busy !== null || !query.trim()}
              className="shrink-0 rounded-[2px] bg-[var(--gold)] px-3 py-[9px] font-body text-[10.5px] font-bold tracking-[1px] text-[var(--noir)] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy === "lookup" ? "…" : "SET"}
            </button>
          </form>

          {message && (
            <p role="alert" className="mt-2 font-body text-[11px] leading-[1.5] text-[#e8a49b]">
              {message}
            </p>
          )}

          {user && (
            <div className="mt-4 border-t border-[var(--hairline)] pt-3">
              <p className="font-body text-[10px] font-bold tracking-[1.4px] text-[var(--text-muted-dark)]">
                SAVED ADDRESSES
              </p>
              {addresses.status === "loading" ? (
                <p className="mt-2 font-body text-[11px] text-[var(--text-muted-dark)]">Loading…</p>
              ) : addresses.status === "error" ? (
                <p className="mt-2 font-body text-[11px] text-[var(--text-muted-dark)]">
                  Couldn&apos;t load your addresses.
                </p>
              ) : addresses.status === "ready" && addresses.addresses.length === 0 ? (
                <p className="mt-2 font-body text-[11px] text-[var(--text-muted-dark)]">No saved addresses yet.</p>
              ) : addresses.status === "ready" ? (
                <ul className="mt-2 flex max-h-[180px] flex-col gap-1 overflow-y-auto">
                  {addresses.addresses.map((a) => {
                    const located = a.latitude != null && a.longitude != null;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => pickAddress(a)}
                          disabled={!located}
                          title={located ? undefined : "This address couldn't be located on the map"}
                          className="flex w-full items-start gap-2 rounded-[2px] px-2 py-[7px] text-left transition hover:bg-[var(--charcoal-2)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Home size={12} className="mt-0.5 shrink-0 text-[var(--gold)]" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-body text-[11.5px] text-[var(--text-on-dark)]">
                              {a.label || a.recipientName}
                            </span>
                            <span className="truncate font-body text-[10.5px] text-[var(--text-muted-dark)]">
                              {a.line1}, {a.city} {a.postalCode}
                              {located ? "" : " · not located"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          )}

          {location && (
            <button
              type="button"
              onClick={() => {
                clearLocation();
                setOpen(false);
              }}
              className="mt-4 font-body text-[11px] text-[var(--text-muted-dark)] underline-offset-2 transition hover:text-[var(--cream)] hover:underline"
            >
              Clear location
            </button>
          )}
        </div>
      )}
    </div>
  );
}
