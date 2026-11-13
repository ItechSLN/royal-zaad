import type { Metadata } from "next";
import LegalPage, { A, Bullets, type LegalSection } from "@/components/store/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Accessibility",
  description: `${LEGAL.brand}'s commitment to an accessible marketplace, and how to get help.`,
};

const sections: LegalSection[] = [
  {
    id: "commitment",
    title: "Our commitment",
    body: (
      <p>
        We want everyone to be able to browse, buy and sell on {LEGAL.brand}, including people who
        use screen readers, keyboard navigation, magnification or voice control. We aim to meet the
        Web Content Accessibility Guidelines (WCAG) 2.1 at level AA.
      </p>
    ),
  },
  {
    id: "what-we-do",
    title: "What we have done",
    body: (
      <Bullets
        items={[
          "Automated WCAG 2.1 A and AA checks of the main shopping pages — home, product listings, product pages, search, shop pages, basket, sign-in and registration, contact, these policies and the seller and staff sign-in pages — with every issue found fixed.",
          "Text and interactive colours meet the AA contrast ratio of 4.5:1.",
          'A "Skip to main content" link at the start of every storefront page.',
          "Product images described by the product name; decorative images hidden from screen readers.",
          "Form fields with visible labels and error messages that explain what to fix.",
          "Custom checkboxes and toggles announced with their role and state.",
          "Sales charts in the seller dashboard come with an equivalent data table for screen readers.",
          "Location is optional: everything works by typing a city or postcode instead of sharing your position.",
          "Pages adapt to small screens and zoom without horizontal scrolling.",
        ]}
      />
    ),
  },
  {
    id: "known-limitations",
    title: "Known limitations",
    body: (
      <>
        <p>We are still working on:</p>
        <Bullets
          items={[
            "A full manual review with screen readers (VoiceOver, NVDA, TalkBack) and keyboard-only use across every page, including checkout and the signed-in seller and staff dashboards, which have only been checked automatically at their sign-in pages.",
            "The card payment form is provided by our payment provider; its accessibility is managed by them.",
            "Map links open OpenStreetMap, an external site we don't control.",
            "Product photos uploaded by sellers may not always have full descriptions beyond the product name.",
            "An Arabic, right-to-left version of the site.",
          ]}
        />
      </>
    ),
  },
  {
    id: "help",
    title: "Getting help and feedback",
    body: (
      <p>
        If anything on {LEGAL.brand} is hard to use, or you need information in another format,{" "}
        <A href="/contact">contact us</A>, email {LEGAL.supportEmail} or call {LEGAL.supportPhone}. Tell
        us the page and what you were trying to do, and we&rsquo;ll help you complete your order and
        fix the problem. We aim to reply within one working day.
      </p>
    ),
  },
];

export default function AccessibilityPage() {
  return (
    <LegalPage
      current="/accessibility"
      eyebrow="ACCESSIBILITY"
      title="Accessibility Statement"
      intro={
        <p>
          How we make {LEGAL.brand} usable for everyone, what we know still needs work, and how to
          get help if something gets in your way.
        </p>
      }
      sections={sections}
    />
  );
}
