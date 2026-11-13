'use client';

import { LogOut, Menu } from "lucide-react";
import { useVendorSession } from "./VendorSessionContext";
import { signOutVendor } from "./VendorSidebar";

export default function VendorHeader({
  setMobileMenuOpen,
  title,
}: {
  setMobileMenuOpen: (open: boolean) => void;
  title: string;
}) {
  const { me, shop } = useVendorSession();
  const initials = (shop.name || `${me.firstName} ${me.lastName}`)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open sidebar"
            className="text-[var(--ink)] lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <h1 className="font-display text-[26px] font-semibold leading-none text-[var(--ink)]">
              {title}
            </h1>
            <p className="truncate font-body text-[11px] text-[var(--ink-muted)]">
              Seller Centre › {shop.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[10px] pl-1.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ink)]">
              {shop.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shop.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-body text-[11px] font-bold text-[var(--gold)]">{initials}</span>
              )}
            </div>
            <div className="hidden flex-col gap-px sm:flex">
              <span className="font-body text-[12.5px] font-semibold text-[var(--ink)]">{shop.name}</span>
              <span className="font-body text-[10.5px] text-[var(--gold-deep)]">
                {me.firstName} {me.lastName}
              </span>
            </div>
          </div>
          {/* The public page only exists once the shop is approved. */}
          {shop.vendor?.status === "ACTIVE" && (
            <a
              href={`/shops/${shop.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-[2px] border border-[var(--border)] px-3 py-[7px] font-body text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--admin-bg)] sm:inline-flex"
            >
              View my shop
            </a>
          )}
          <button
            type="button"
            onClick={signOutVendor}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[2px] border border-[var(--border)] transition hover:bg-[var(--admin-bg)]"
          >
            <LogOut size={15} className="text-[var(--ink)]" />
          </button>
        </div>
      </div>
    </header>
  );
}
