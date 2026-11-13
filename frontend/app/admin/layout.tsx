"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Toaster } from "sonner";
import AdminHeader from '@/components/admin/common/AdminHeader';
import AdminSidebar from '@/components/admin/common/AdminSidebar';
import AdminAuthGuard from '@/components/admin/common/AdminAuthGuard';

const PAGE_META: { match: string; title: string; breadcrumb: string }[] = [
  { match: '/admin/orders', title: 'Orders', breadcrumb: 'Commerce  ›  Orders' },
  { match: '/admin/products', title: 'Products', breadcrumb: 'Commerce  ›  Products' },
  { match: '/admin/categories', title: 'Categories', breadcrumb: 'Commerce  ›  Categories' },
  { match: '/admin/brands', title: 'Brands', breadcrumb: 'Commerce  ›  Brands' },
  { match: '/admin/customers', title: 'Customers', breadcrumb: 'Commerce  ›  Customers' },
  { match: '/admin/reviews', title: 'Reviews', breadcrumb: 'Commerce  ›  Reviews' },
  { match: '/admin/messages', title: 'Messages', breadcrumb: 'Commerce  ›  Messages' },
  { match: '/admin/vendors', title: 'Vendors', breadcrumb: 'Marketplace  ›  Vendors' },
  { match: '/admin/moderation/reports', title: 'Reports', breadcrumb: 'Marketplace  ›  Reports' },
  { match: '/admin/moderation', title: 'Moderation', breadcrumb: 'Marketplace  ›  Moderation' },
  { match: '/admin/payouts', title: 'Payouts', breadcrumb: 'Marketplace  ›  Payouts' },
  { match: '/admin/marketplace', title: 'Marketplace Settings', breadcrumb: 'Marketplace  ›  Settings' },
  { match: '/admin/inventory', title: 'Inventory', breadcrumb: 'Operations  ›  Inventory' },
  { match: '/admin/warehouses', title: 'Warehouses', breadcrumb: 'Operations  ›  Warehouses' },
  { match: '/admin/purchase-orders', title: 'Purchase Orders', breadcrumb: 'Operations  ›  Purchases' },
  { match: '/admin/delivery', title: 'Delivery', breadcrumb: 'Operations  ›  Delivery' },
  { match: '/admin/suppliers', title: 'Suppliers', breadcrumb: 'Operations  ›  Suppliers' },
  { match: '/admin/campaigns', title: 'Campaigns', breadcrumb: 'Marketing  ›  Campaigns' },
  { match: '/admin/cms', title: 'CMS', breadcrumb: 'Marketing  ›  CMS' },
  { match: '/admin/invoices', title: 'Invoices', breadcrumb: 'Finance  ›  Invoices' },
  { match: '/admin/returns', title: 'Returns', breadcrumb: 'Finance  ›  Returns' },
  { match: '/admin/tax', title: 'Tax & VAT', breadcrumb: 'Finance  ›  Tax' },
  { match: '/admin/notifications', title: 'Notifications', breadcrumb: 'System  ›  Notifications' },
  { match: '/admin/audit-log', title: 'Audit Log', breadcrumb: 'System  ›  Audit Log' },
  { match: '/admin/promotions', title: 'Promotions', breadcrumb: 'Marketing  ›  Promotions' },
  { match: '/admin/coupons', title: 'Coupons', breadcrumb: 'Marketing  ›  Coupons' },
  { match: '/admin/reports', title: 'Reports', breadcrumb: 'Finance  ›  Reports' },
  { match: '/admin/users', title: 'Users & Roles', breadcrumb: 'System  ›  Users' },
  { match: '/admin/roles', title: 'Roles', breadcrumb: 'System  ›  Roles' },
  { match: '/admin/settings', title: 'Settings', breadcrumb: 'System  ›  Settings' },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginScreen = pathname === '/admin/login';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const meta = useMemo(() => {
    const hit = PAGE_META.find((m) => pathname === m.match || pathname.startsWith(`${m.match}/`));
    return hit ?? { title: 'Dashboard', breadcrumb: 'Home  ›  Overview' };
  }, [pathname]);

  if (isLoginScreen) {
    return <main className="min-h-screen bg-[var(--noir)] text-[var(--ink)]">{children}</main>;
  }

  return (
    <AdminAuthGuard>
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

          <AdminSidebar mobileMenuOpen={mobileMenuOpen} isActive={isActive} />

          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeader
              setMobileMenuOpen={setMobileMenuOpen}
              title={meta.title}
              breadcrumb={meta.breadcrumb}
            />

            <section className="min-w-0 flex-1 px-5 py-6 lg:px-7">
              {children}
              <Toaster position="top-right" richColors />
            </section>
          </div>
        </div>
      </main>
    </AdminAuthGuard>
  );
}
