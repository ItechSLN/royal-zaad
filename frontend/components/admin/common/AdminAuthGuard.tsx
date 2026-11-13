"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession } from "@/services/auth.service";
import { isStaffKind } from "@/lib/api";

type State = "checking" | "allowed" | "denied";

/**
 * Gates the admin shell. The API is the real authority — this only stops the
 * back office from rendering a full page of failed requests to someone who
 * isn't signed in as staff, and sends them to the login screen instead.
 */
export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!localStorage.getItem("authToken")) {
        if (active) setState("denied");
        router.replace("/admin/login");
        return;
      }

      try {
        const session = await getAdminSession();
        if (!active) return;

        if (isStaffKind(session.roleKind)) {
          setState("allowed");
          return;
        }

        // Signed in, but as a storefront customer.
        localStorage.removeItem("authToken");
        setState("denied");
        router.replace("/admin/login");
      } catch {
        // 401/403 already cleared the session in the API layer.
        if (!active) return;
        setState("denied");
        router.replace("/admin/login");
      }
    };

    void verify();
    return () => {
      active = false;
    };
  }, [router]);

  if (state !== "allowed") {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--admin-bg)]">
        <p className="text-sm text-[var(--ink-muted)]">
          {state === "checking" ? "Checking your session…" : "Redirecting to sign in…"}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
