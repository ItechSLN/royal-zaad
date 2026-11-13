'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BookOpen,
  Flag,
  HandCoins,
  ShieldAlert,
  SlidersHorizontal,
  Store,
  Boxes,
  ClipboardList,
  FileText,
  Gift,
  Landmark,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  type LucideIcon,
  Package,
  Percent,
  ReceiptText,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Ticket,
  Truck,
  Undo2,
  Users,
  Warehouse,
} from 'lucide-react';
import BrandMark from "@/components/brand/BrandMark";
import { getVendors } from '@/services/marketplace-admin.service';

type NavItem = { label: string; icon: LucideIcon; href?: string; badge?: 'pendingVendors' };
type NavSection = { title: string; items: NavItem[] };

/** Mirrors C/Admin Sidebar. Items without an href have no route yet and stay inert. */
const SECTIONS: NavSection[] = [
  {
    title: 'COMMERCE',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
      { label: 'Orders', icon: ShoppingCart, href: '/admin/orders' },
      { label: 'Products', icon: Package, href: '/admin/products' },
      { label: 'Categories', icon: Layers, href: '/admin/categories' },
      { label: 'Brands', icon: BookOpen, href: '/admin/brands' },
      { label: 'Customers', icon: Users, href: '/admin/customers' },
      { label: 'Reviews', icon: Star, href: '/admin/reviews' },
      { label: 'Messages', icon: MessageSquare, href: '/admin/messages' },
    ],
  },
  {
    title: 'MARKETPLACE',
    items: [
      { label: 'Vendors', icon: Store, href: '/admin/vendors', badge: 'pendingVendors' },
      { label: 'Moderation', icon: ShieldAlert, href: '/admin/moderation' },
      { label: 'Reports', icon: Flag, href: '/admin/moderation/reports' },
      { label: 'Payouts', icon: HandCoins, href: '/admin/payouts' },
      { label: 'Marketplace settings', icon: SlidersHorizontal, href: '/admin/marketplace' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Inventory', icon: Boxes, href: '/admin/inventory' },
      { label: 'Warehouses', icon: Warehouse, href: '/admin/warehouses' },
      { label: 'Purchases', icon: ClipboardList, href: '/admin/purchase-orders' },
      { label: 'Delivery', icon: Truck, href: '/admin/delivery' },
      { label: 'Suppliers', icon: Landmark, href: '/admin/suppliers' },
    ],
  },
  {
    title: 'MARKETING',
    items: [
      { label: 'Promotions', icon: Percent, href: '/admin/promotions' },
      { label: 'Coupons', icon: Ticket, href: '/admin/coupons' },
      { label: 'Campaigns', icon: Gift, href: '/admin/campaigns' },
      { label: 'CMS', icon: FileText, href: '/admin/cms' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { label: 'Invoices', icon: ReceiptText, href: '/admin/invoices' },
      { label: 'Returns', icon: Undo2, href: '/admin/returns' },
      { label: 'Tax', icon: Scale, href: '/admin/tax' },
      { label: 'Reports', icon: FileText, href: '/admin/reports' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Users & Roles', icon: ShieldCheck, href: '/admin/users' },
      { label: 'Notifications', icon: Bell, href: '/admin/notifications' },
      { label: 'Audit Log', icon: BookOpen, href: '/admin/audit-log' },
      { label: 'Settings', icon: Settings, href: '/admin/settings' },
    ],
  },
];

export default function AdminSidebar({
  mobileMenuOpen,
  isActive,
}: {
  mobileMenuOpen: boolean;
  isActive: (href: string) => boolean;
}) {
  const pathname = usePathname();
  const [pendingVendors, setPendingVendors] = useState<number | null>(null);

  // Vendor applications waiting for a decision; refreshed as the admin navigates.
  useEffect(() => {
    let cancelled = false;
    getVendors({ status: 'PENDING', limit: 1 })
      .then((res) => !cancelled && setPendingVendors(res.meta.total))
      .catch(() => !cancelled && setPendingVendors(null));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Only the most specific matching link is active (e.g. Reports under Moderation).
  const activeHref = SECTIONS.flatMap((s) => s.items)
    .map((i) => i.href)
    .filter((href): href is string => !!href && isActive(href))
    .sort((a, b) => b.length - a.length)[0];

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/admin/login';
  };

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 flex w-[252px] shrink-0 flex-col overflow-y-auto bg-[var(--noir)] pb-[18px] pt-[22px] transition-transform duration-300',
        'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      {/* Logo block */}
      <div className="flex flex-col gap-[3px] px-5 pb-5">
        <span className="flex items-center gap-[9px]">
          <BrandMark size={24} variant="compact" className="shrink-0 text-[var(--gold)]" />
          <span className="font-display text-[20px] leading-none tracking-[4.5px] text-[var(--cream)]">
            ROYAL ZAAD
          </span>
        </span>
        <span className="font-body text-[7px] tracking-[1.9px] text-[var(--gold)]">
          ERP · COMMERCE SUITE
        </span>
      </div>

      <div className="h-px w-full bg-[var(--hairline)]" />

      <nav className="flex-1">
        {SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-px pb-1 pt-4">
            <div className="px-5 pb-2">
              <span className="font-body text-[9px] font-bold tracking-[1.8px] text-[var(--text-muted-dark)]">
                {section.title}
              </span>
            </div>

            {section.items.map((item) => {
              const active = !!item.href && item.href === activeHref;
              const badge = item.badge === 'pendingVendors' ? pendingVendors : null;
              const content = (
                <>
                  <item.icon
                    size={15}
                    className={active ? 'text-[var(--gold)]' : 'text-[var(--text-muted-dark)]'}
                  />
                  <span
                    className={`font-body text-[12.5px] ${
                      active ? 'text-[var(--cream)]' : 'text-[var(--text-on-dark)]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {badge ? (
                    <span
                      title={`${badge} pending application${badge === 1 ? '' : 's'}`}
                      className="ml-auto rounded-[2px] bg-[var(--gold)] px-1.5 py-px font-mono text-[9.5px] font-bold text-[var(--noir)]"
                    >
                      {badge}
                    </span>
                  ) : null}
                </>
              );

              const classes = [
                'flex w-full items-center gap-[11px] px-5 py-[9px] transition',
                active ? 'bg-[var(--charcoal)]' : 'hover:bg-[var(--noir-2)]',
              ].join(' ');

              return item.href ? (
                <Link key={item.label} href={item.href} className={classes}>
                  {content}
                </Link>
              ) : (
                <span
                  key={item.label}
                  aria-disabled
                  className={`${classes} cursor-default opacity-45`}
                >
                  {content}
                </span>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto px-5 pt-4">
        <div className="mb-3 h-px w-full bg-[var(--hairline)]" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-[11px] py-[9px] text-left transition hover:opacity-80"
        >
          <LogOut size={15} className="text-[var(--text-muted-dark)]" />
          <span className="font-body text-[12.5px] text-[var(--text-on-dark)]">Log out</span>
        </button>
      </div>
    </aside>
  );
}
