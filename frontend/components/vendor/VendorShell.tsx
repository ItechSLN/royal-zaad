"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import VendorSidebar from "./VendorSidebar";
import VendorHeader from "./VendorHeader";
import VendorStatusBanner from "./VendorStatusBanner";
import { VendorSessionProvider } from "./VendorSessionContext";

/** Reachable without a vendor session. */
const PUBLIC_PATHS = ["/vendor/login", "/vendor/register", "/vendor/verify-email"];

const TITLES: { match: string; title: string }[] = [
  { match: "/vendor/products", title: "Products" },
  { match: "/vendor/inventory", title: "Inventory" },
  { match: "/vendor/orders", title: "Orders" },
  { match: "/vendor/shop", title: "Shop settings" },
  { match: "/vendor/payouts", title: "Payouts" },
];

/** Client shell: public auth screens render bare; everything else is gated. */
export default function VendorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile drawer on navigation.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileMenuOpen(false);
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return (
      <main className="min-h-screen bg-[var(--admin-bg)] text-[var(--ink)]">
        {children}
        <Toaster position="top-right" richColors />
      </main>
    );
  }

  const isActive = (href: string) =>
    href === "/vendor" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const title =
    TITLES.find((t) => pathname === t.match || pathname.startsWith(`${t.match}/`))?.title ?? "Overview";

  return (
    <VendorSessionProvider>
      <main className="min-h-screen bg-[var(--admin-bg)] text-[var(--ink)]">
        <div className="flex min-h-screen">
          {mobileMenuOpen && (
            <button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-0 z-30 bg-[var(--noir)]/50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          <VendorSidebar mobileMenuOpen={mobileMenuOpen} isActive={isActive} />
          <div className="flex min-w-0 flex-1 flex-col">
            <VendorHeader setMobileMenuOpen={setMobileMenuOpen} title={title} />
            <section className="min-w-0 flex-1 px-5 py-6 lg:px-7">
              <VendorStatusBanner />
              {children}
            </section>
          </div>
        </div>
        <Toaster position="top-right" richColors />
      </main>
    </VendorSessionProvider>
  );
}
