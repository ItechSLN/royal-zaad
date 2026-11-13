import { SITE_CONTACT } from "@/lib/site-contact";

/**
 * Facts the legal pages (privacy, terms, cookies, accessibility) depend on.
 *
 * TODO before launch — every value in [brackets] must be replaced with the
 * operating company's real details, and the finished pages reviewed by a
 * lawyer qualified in the countries you sell to. Until then the pages render
 * the bracketed placeholders visibly, so they can't be mistaken for final.
 */
export const LEGAL = {
  /** Date shown as "Last updated" on every legal page. */
  lastUpdated: "13 October 2026",
  brand: "Royal Zaad",
  /** The registered legal entity that operates the marketplace. */
  companyName: "[Registered company name]",
  commercialRegistration: "[Commercial Registration (CR) number]",
  vatNumber: "[VAT registration number]",
  registeredAddress: "[Registered office address]",
  /** Law that governs the terms, and courts with jurisdiction. */
  governingLaw: "[the Kingdom of Saudi Arabia]",
  courts: "[the competent courts of Riyadh]",
  /** Where privacy requests go — ideally a dedicated mailbox or your DPO. */
  privacyEmail: "[privacy@royalzaad.com]",
  supportEmail: SITE_CONTACT.email,
  supportPhone: SITE_CONTACT.phone,
  /** Days after delivery a customer can start a return (matches the storefront promise). */
  returnWindowDays: 30,
  /** Minimum age to hold an account. */
  minimumAge: 18,
} as const;

export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/accessibility", label: "Accessibility" },
] as const;
