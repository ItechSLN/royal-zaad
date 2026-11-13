'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { isVendorKind } from "@/lib/api";
import {
  getVendorMe,
  getVendorShop,
  type VendorMe,
  type VendorShop,
} from "@/services/vendor.service";

type VendorSession = {
  me: VendorMe;
  shop: VendorShop;
  /** Re-reads the shop (status, verification) after a change. */
  refreshShop: () => Promise<void>;
  /** Merges a PATCH response into the cached shop without a refetch. */
  mergeShop: (patch: Partial<VendorShop>) => void;
};

const Ctx = createContext<VendorSession | null>(null);

export const useVendorSession = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useVendorSession must be used inside the vendor shell");
  return value;
};

type State = "checking" | "denied" | "error" | "ready";

/**
 * Gates the vendor workspace. The API is the real authority (every /vendor
 * route checks the caller's shop) — this just stops a page of failed requests
 * from rendering for someone who isn't signed in as a shop owner.
 */
export function VendorSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [me, setMe] = useState<VendorMe | null>(null);
  const [shop, setShop] = useState<VendorShop | null>(null);

  const verify = useCallback(async () => {
    if (!localStorage.getItem("authToken")) {
      setState("denied");
      router.replace("/vendor/login");
      return;
    }
    try {
      const session = await getVendorMe();
      if (!isVendorKind(session.roleKind)) {
        setState("denied");
        router.replace("/vendor/login");
        return;
      }
      setMe(session);
      setShop(await getVendorShop());
      setState("ready");
    } catch (error) {
      const status = (error as { status?: number })?.status;
      // 401/403 are handled (and redirected) by the API layer.
      if (status === 401 || status === 403) {
        setState("denied");
        router.replace("/vendor/login");
      } else {
        setState("error");
      }
    }
  }, [router]);

  useEffect(() => {
    // Session check on mount; verify() updates state once the API answers.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void verify();
  }, [verify]);

  const refreshShop = useCallback(async () => {
    try {
      setShop(await getVendorShop());
    } catch {
      /* keep what is on screen */
    }
  }, []);

  const mergeShop = useCallback((patch: Partial<VendorShop>) => {
    setShop((prev) => (prev ? { ...prev, ...patch, vendor: prev.vendor } : prev));
  }, []);

  if (state !== "ready" || !me || !shop) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--admin-bg)]">
        {state === "error" ? (
          <div className="flex flex-col items-center gap-3 font-body text-[12.5px]">
            <span className="text-[var(--danger)]">Couldn&apos;t load your shop.</span>
            <button
              type="button"
              onClick={() => {
                setState("checking");
                void verify();
              }}
              className="inline-flex items-center gap-1 font-semibold text-[var(--ink)] hover:underline"
            >
              <RotateCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <p className="font-body text-sm text-[var(--ink-muted)]">
            {state === "checking" ? "Checking your session…" : "Redirecting to sign in…"}
          </p>
        )}
      </main>
    );
  }

  return <Ctx.Provider value={{ me, shop, refreshShop, mergeShop }}>{children}</Ctx.Provider>;
}
