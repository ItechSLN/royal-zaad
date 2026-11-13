import type { Metadata } from "next";
import LegalPage, { A, LegalTable, type LegalSection } from "@/components/store/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `What ${LEGAL.brand} stores in your browser, and why.`,
};

const sections: LegalSection[] = [
  {
    id: "summary",
    title: "The short version",
    body: (
      <p>
        {LEGAL.brand} does not use advertising, tracking or analytics cookies. We keep a small amount
        of information in your browser&rsquo;s local storage so the site works — your sign-in, your
        basket, the location you chose and your language. Our payment provider sets its own cookies
        only on the card payment step, to prevent fraud. Because all of these are needed for the
        service you asked for, we don&rsquo;t show a cookie banner.
      </p>
    ),
  },
  {
    id: "our-storage",
    title: "What we store in your browser",
    body: (
      <>
        <p>
          These items are kept in your browser&rsquo;s local storage, on your device only. They are
          not cookies and are not sent to other websites.
        </p>
        <LegalTable
          caption="Items Royal Zaad stores in your browser"
          head={["Name", "Purpose", "How long"]}
          rows={[
            ["authToken", "Keeps you signed in to your account, seller dashboard or admin dashboard.", "Until you sign out. It stops working after 7 days for customers, 12 hours for sellers and 8 hours for staff."],
            ["cart", "Remembers the products in your basket and which shop each comes from.", "Until you check out or clear it."],
            ["rz.location", <>The location you chose for nearby shops and distances — a point and a label such as &ldquo;Riyadh&rdquo;. Only saved if you set a location.</>, "Until you change or clear it."],
            ["preferredLanguage", "Remembers your language choice.", "Until you change it."],
          ]}
        />
      </>
    ),
  },
  {
    id: "third-party",
    title: "Cookies set by others",
    body: (
      <>
        <LegalTable
          caption="Third-party cookies"
          head={["Set by", "Name", "Purpose", "How long"]}
          rows={[
            ["Stripe (payments)", "__stripe_mid", "Fraud prevention for card payments. Set only when you open the card payment step.", "1 year"],
            ["Stripe (payments)", "__stripe_sid", "Fraud prevention for the current payment session.", "30 minutes"],
          ]}
        />
        <p>
          See <A href="https://stripe.com/cookie-settings">Stripe&rsquo;s cookie information</A> for
          details. Product images are loaded from our image host, and map links open OpenStreetMap
          in a new tab; these services may receive your IP address like any website you load content
          from, but we do not ask them to set tracking cookies.
        </p>
      </>
    ),
  },
  {
    id: "control",
    title: "Your choices",
    body: (
      <p>
        You can clear local storage and cookies at any time in your browser settings; you&rsquo;ll
        be signed out and your basket and location will be forgotten. Blocking Stripe&rsquo;s cookies
        may prevent card payments; you can still pay by cash on delivery where a shop offers it.
        Location is never shared unless you choose to set one.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        If we ever add analytics or other non-essential cookies, we will update this page and ask
        for your consent before setting them. See our <A href="/privacy">Privacy Policy</A> for how
        we use personal data.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      current="/cookies"
      eyebrow="LEGAL"
      title="Cookie Policy"
      intro={<p>What {LEGAL.brand} stores on your device, why, and how to control it.</p>}
      sections={sections}
    />
  );
}
