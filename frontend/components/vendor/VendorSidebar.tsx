'use client';

import Link from "next/link";
import {
  Banknote,
  Boxes,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import { clearVendorToken } from "@/services/vendor.service";

const NAV: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/vendor" },
  { label: "Products", icon: Package, href: "/vendor/products" },
  { label: "Inventory", icon: Boxes, href: "/vendor/inventory" },
  { label: "Orders", icon: ShoppingCart, href: "/vendor/orders" },
  { label: "Shop settings", icon: Store, href: "/vendor/shop" },
  { label: "Payouts", icon: Banknote, href: "/vendor/payouts" },
];

export const signOutVendor = () => {
  clearVendorToken();
  // Full reload on purpose: drops every cached piece of the vendor session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/vendor/login";
};

/** Same noir rail as the back office, with the shop-owner sections. */
export default function VendorSidebar({
  mobileMenuOpen,
  isActive,
}: {
  mobileMenuOpen: boolean;
  isActive: (href: string) => boolean;
}) {
  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex w-[236px] shrink-0 flex-col overflow-y-auto bg-[var(--noir)] pb-[18px] pt-[22px] transition-transform duration-300",
        "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="flex flex-col gap-[3px] px-5 pb-5">
        <span className="flex items-center gap-[9px]">
          <BrandMark size={24} variant="compact" className="shrink-0 text-[var(--gold)]" />
          <span className="font-display text-[20px] leading-none tracking-[4.5px] text-[var(--cream)]">
            ROYAL ZAAD
          </span>
        </span>
        <span className="font-body text-[7px] tracking-[1.9px] text-[var(--gold)]">SELLER CENTRE</span>
      </div>

      <div className="h-px w-full bg-[var(--hairline)]" />

      <nav className="flex flex-1 flex-col gap-px pt-4">
        <div className="px-5 pb-2">
          <span className="font-body text-[9px] font-bold tracking-[1.8px] text-[var(--text-muted-dark)]">
            YOUR SHOP
          </span>
        </div>
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-[11px] px-5 py-[9px] transition ${
                active ? "bg-[var(--charcoal)]" : "hover:bg-[var(--noir-2)]"
              }`}
            >
              <item.icon
                size={15}
                className={active ? "text-[var(--gold)]" : "text-[var(--text-muted-dark)]"}
              />
              <span
                className={`font-body text-[12.5px] ${
                  active ? "text-[var(--cream)]" : "text-[var(--text-on-dark)]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-5 pt-4">
        <div className="mb-3 h-px w-full bg-[var(--hairline)]" />
        <button
          type="button"
          onClick={signOutVendor}
          className="flex w-full items-center gap-[11px] py-[9px] text-left transition hover:opacity-80"
        >
          <LogOut size={15} className="text-[var(--text-muted-dark)]" />
          <span className="font-body text-[12.5px] text-[var(--text-on-dark)]">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
