import type { Metadata } from "next";
import type { ReactNode } from "react";
import VendorShell from "@/components/vendor/VendorShell";

export const metadata: Metadata = {
  title: "Seller Centre",
  description: "Manage your Royal Zaad shop — products, stock, orders and payouts.",
};

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <VendorShell>{children}</VendorShell>;
}
