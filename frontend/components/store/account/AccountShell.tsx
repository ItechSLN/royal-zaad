'use client';

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getAccountSummary,
  getProfile,
  type AccountProfile,
  type AccountSummary,
} from "@/services/account.service";

const NAV: { label: string; href: string }[] = [
  { label: "Overview", href: "/account" },
  { label: "My Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Account Settings", href: "/account/settings" },
];

/** Shared chrome for SF-13 … SF-19 — profile hero plus the account rail. */
export default function AccountShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [summary, setSummary] = useState<AccountSummary | null>(null);

  // The account area is for the signed-in customer only.
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname ?? "/account")}`);
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    if (!user) return;
    getProfile().then(setProfile).catch(() => setProfile(null));
    getAccountSummary().then(setSummary).catch(() => setSummary(null));
  }, [user]);

  const name = profile
    ? `${profile.firstName} ${profile.lastName}`
    : user
      ? `${user.firstName} ${user.lastName}`
      : "";
  const email = profile?.email ?? user?.email ?? "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col gap-6 bg-[var(--ink)] px-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="flex items-center gap-4">
          <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[var(--gold)] font-body text-[16px] font-bold text-[var(--gold)]">
            {initials}
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-display text-[30px] text-[var(--cream)]">{name}</span>
            <span className="font-body text-[11.5px] text-[var(--text-muted-dark)]">
              {[
                profile?.memberSince
                  ? `Member since ${new Date(profile.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
                  : null,
                email,
                profile?.phone,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          {[
            { label: "ORDERS", value: summary ? String(summary.orders) : "—" },
            {
              label: "LIFETIME SPEND",
              value: summary
                ? `$${Number(summary.totalSpend).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : "—",
            },
            { label: "WISHLIST", value: summary ? String(summary.wishlist) : "—" },
            { label: "ADDRESSES", value: summary ? String(summary.addresses) : "—" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="font-body text-[9px] font-bold tracking-[1.8px] text-[var(--gold)]">
                {s.label}
              </span>
              <span className="font-display text-[22px] text-[var(--cream)]">{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Body */}
      <div className="flex flex-col gap-10 bg-[var(--cream)] px-6 py-10 lg:flex-row lg:px-12">
        <aside className="w-full shrink-0 lg:w-[240px]">
          <nav className="flex flex-col">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const classes = `border-l-2 px-4 py-[10px] text-left font-body text-[12.5px] transition ${
                active
                  ? "border-[var(--gold)] bg-[var(--cream-2)] font-semibold text-[var(--ink)]"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`;
              return (
                <Link key={item.label} href={item.href} className={classes}>
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="border-l-2 border-transparent px-4 py-[10px] text-left font-body text-[12.5px] text-[var(--danger)] transition hover:opacity-80"
            >
              Sign out
            </button>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[34px] leading-tight text-[var(--ink)]">{title}</h1>
              <p className="font-body text-[11.5px] text-[var(--ink-muted)]">{subtitle}</p>
            </div>
            {action}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
