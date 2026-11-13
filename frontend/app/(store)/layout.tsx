'use client';

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import Header from "@/components/store/layout/Header";
import Footer from "@/components/store/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LocationProvider } from "@/context/LocationContext";

export default function StoreLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  // SF-10/11/12 are full-bleed split screens with their own brand mark — the
  // site header and footer are deliberately absent there.
  const bare = pathname?.startsWith("/auth");

  return (
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <div className="flex min-h-screen flex-col bg-[var(--cream)] text-[var(--ink)]">
            {/* First focusable element: lets keyboard and screen-reader users jump past the header. */}
            <a
              href="#main-content"
              className="sr-only z-[100] rounded-[2px] bg-[var(--ink)] px-4 py-3 font-body text-[13px] font-semibold text-[var(--cream)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
              Skip to main content
            </a>
            {!bare && <Header />}
            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
            {!bare && <Footer />}
            <Toaster position="top-right" richColors />
          </div>
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
