'use client';

import { useEffect, useState } from 'react';
import { Bell, Globe, Menu, MessageSquare, Search } from 'lucide-react';
import { getAdminSession } from '@/services/auth.service';

type SessionUser = { firstName: string; lastName: string; role: string };

/** Mirrors C/Admin Topbar — display title + breadcrumb, search, icon buttons, user chip. */
export default function AdminHeader({
  setMobileMenuOpen,
  title = 'Dashboard',
  breadcrumb = 'Home  ›  Overview',
  searchPlaceholder = 'Search orders, SKU, customers…',
}: {
  setMobileMenuOpen: (open: boolean) => void;
  title?: string;
  breadcrumb?: string;
  searchPlaceholder?: string;
}) {
  const [me, setMe] = useState<SessionUser | null>(null);

  // The signed-in staff member, so the chip never shows someone else.
  useEffect(() => {
    getAdminSession()
      .then((session) => setMe(session as SessionUser))
      .catch(() => setMe(null));
  }, []);

  const initials = me
    ? `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-7">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open sidebar"
            className="text-[var(--ink)] lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-col gap-[3px]">
            <h1 className="font-display text-[26px] font-semibold leading-none text-[var(--ink)]">
              {title}
            </h1>
            <p className="font-body text-[11px] text-[var(--ink-muted)]">{breadcrumb}</p>
          </div>
        </div>

        <div className="flex items-center gap-[14px]">
          <div className="hidden w-[260px] items-center gap-2 rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-3 py-[9px] xl:flex">
            <Search size={14} className="text-[var(--ink-muted)]" />
            <input
              placeholder={searchPlaceholder}
              className="w-full bg-transparent font-body text-[12px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            {[Bell, MessageSquare, Globe].map((Icon, i) => (
              <button
                key={i}
                type="button"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[2px] border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--admin-bg)]"
              >
                <Icon size={15} className="text-[var(--ink)]" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-[10px] pl-1.5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--ink)]">
              <span className="font-body text-[11px] font-bold text-[var(--gold)]">{initials}</span>
            </div>
            <div className="hidden flex-col gap-px sm:flex">
              <span className="font-body text-[12.5px] font-semibold text-[var(--ink)]">
                {me ? `${me.firstName} ${me.lastName}` : ''}
              </span>
              <span className="font-body text-[10.5px] text-[var(--gold-deep)]">{me?.role ?? ''}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
