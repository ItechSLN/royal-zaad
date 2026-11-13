import Link from "next/link";
import BrandMark from "@/components/brand/BrandMark";

/** lucide-react v1 no longer ships brand marks, so the four socials in the
 *  design are drawn inline at the same 15px size. */
const SOCIALS: { label: string; path: string }[] = [
  {
    label: "Instagram",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.07-.9 0-1.4.2-1.7.3-.4.2-.7.4-1 .7-.3.3-.5.6-.7 1-.1.3-.3.8-.3 1.7C3.5 8.5 3.5 8.9 3.5 12s0 3.5.07 4.7c0 .9.2 1.4.3 1.7.2.4.4.7.7 1 .3.3.6.5 1 .7.3.1.8.3 1.7.3 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c.9 0 1.4-.2 1.7-.3.4-.2.7-.4 1-.7.3-.3.5-.6.7-1 .1-.3.3-.8.3-1.7.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c0-.9-.2-1.4-.3-1.7-.2-.4-.4-.7-.7-1-.3-.3-.6-.5-1-.7-.3-.1-.8-.3-1.7-.3C15.5 4 15.1 4 12 4Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm6.2-8.3a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z",
  },
  {
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z",
  },
  {
    label: "X",
    path: "M17.5 3h3l-6.6 7.5L21.6 21h-6l-4.7-6.1L5.5 21h-3l7-8L2.6 3h6.1l4.2 5.6L17.5 3Zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5Z",
  },
  {
    label: "YouTube",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3-5.2 3Z",
  },
];

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "SHOP",
    links: [
      { label: "Honey", href: "/products?search=honey" },
      { label: "Coffee", href: "/products?search=coffee" },
      { label: "Nuts", href: "/products?search=nuts" },
      { label: "Clothing", href: "/products?search=clothing" },
      { label: "Hair Oil", href: "/products?search=hair+oil" },
      { label: "Body Soap", href: "/products?search=soap" },
      { label: "Gift Cards", href: "/products" },
    ],
  },
  {
    title: "CUSTOMER CARE",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Sell on Royal Zaad", href: "/vendor/register" },
      { label: "FAQ", href: "#" },
      { label: "Shipping Policy", href: "/terms#delivery" },
      { label: "Return Policy", href: "/terms#cancellations" },
      { label: "Order Tracking", href: "/account/orders" },
      { label: "Size Guide", href: "#" },
    ],
  },
  {
    title: "ZAAD",
    links: [
      { label: "About Us", href: "#" },
      { label: "Brand Story", href: "#" },
      { label: "Our Ingredients", href: "#" },
      { label: "Journal", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
];

const PAYMENTS = ["VISA", "MASTERCARD", "AMEX", "MADA", "APPLE PAY", "COD"];

export default function Footer() {
  return (
    <footer className="bg-[var(--noir)] px-6 pb-8 pt-16 lg:px-12">
      <div className="flex flex-col gap-[44px]">
        <div className="flex flex-col gap-[56px] lg:flex-row">
          {/* Brand */}
          <div className="flex w-full flex-col gap-4 lg:w-[340px]">
            <div className="flex items-center gap-3">
              <BrandMark size={40} className="shrink-0 text-[var(--gold)]" />
              <span className="flex flex-col gap-[3px]">
                <span className="font-display text-[24px] leading-none tracking-[5px] text-[var(--cream)]">
                  ROYAL ZAAD
                </span>
                <span lang="ar" dir="rtl" className="font-arabic text-[19px] leading-none text-[var(--cream)]">
                  الزاد الملكي
                </span>
              </span>
            </div>
            <p className="font-body text-[12px] leading-[1.8] text-[var(--text-muted-dark)]">
              Small-batch honey, single-origin coffee, hand-selected nuts and quiet luxury
              essentials — sourced from the highlands and finished by hand.
            </p>
            <div className="flex items-center gap-4">
              {SOCIALS.map((social) => (
                <a key={social.label} href="#" aria-label={social.label}>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[15px] w-[15px] fill-[var(--gold)] transition hover:fill-[var(--champagne)]"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-1 flex-col gap-[14px]">
              <p className="font-body text-[10px] font-bold tracking-[2px] text-[var(--gold)]">
                {col.title}
              </p>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="font-body text-[12px] text-[var(--text-muted-dark)] transition hover:text-[var(--champagne)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          {/* Newsletter */}
          <div className="flex w-full flex-col gap-[14px] lg:w-[280px]">
            <p className="font-body text-[10px] font-bold tracking-[2px] text-[var(--gold)]">
              THE ZAAD LETTER
            </p>
            <p className="font-body text-[12px] leading-[1.7] text-[var(--text-muted-dark)]">
              Private harvests, early access and seasonal editions.
            </p>
            {/* No mailing list exists yet — don't collect addresses we won't use. */}
            <p className="border border-[var(--hairline)] px-[14px] py-3 font-body text-[12px] text-[var(--text-on-dark)]">
              Launching soon.
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-[var(--hairline)]" />

        <div className="flex flex-col items-center justify-between gap-5 lg:flex-row">
          <p className="font-body text-[11px] text-[var(--text-muted-dark)]">
            © {new Date().getFullYear()} Royal Zaad Trading Co. — All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-[10px]">
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="rounded-[2px] border border-[var(--hairline)] px-[9px] py-[5px] font-body text-[8px] font-semibold tracking-[0.8px] text-[var(--text-muted-dark)]"
              >
                {p}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-[14px]">
            <span className="font-body text-[11px] text-[var(--champagne)]">
              English&nbsp;&nbsp;/&nbsp;&nbsp;العربية
            </span>
            <span className="font-body text-[11px] text-[var(--champagne)]">USD $</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
