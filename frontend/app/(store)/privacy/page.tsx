import type { Metadata } from "next";
import LegalPage, { A, Bullets, LegalTable, type LegalSection } from "@/components/store/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${LEGAL.brand} collects, uses and protects your personal data.`,
};

const mail = (address: string) =>
  address.startsWith("[") ? address : <A href={`mailto:${address}`}>{address}</A>;

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {LEGAL.brand} is an online marketplace operated by {LEGAL.companyName} (Commercial
          Registration {LEGAL.commercialRegistration}), {LEGAL.registeredAddress} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). We run the website, your account, search, checkout and payments.
        </p>
        <p>
          Products are sold by independent shops (&ldquo;sellers&rdquo;) as well as by our own{" "}
          {LEGAL.brand} shop. When you buy from a seller, that seller receives the details it needs
          to fulfil your order and is responsible for how it uses them (see section 5).
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "The data we collect",
    body: (
      <LegalTable
        caption="Personal data we collect"
        head={["Data", "When", "Details"]}
        rows={[
          ["Account details", "When you register", "Name, email address and password. Your password is stored only as a one-way hash — we can't read it."],
          ["Delivery addresses", "When you save an address", "Recipient name, address, postcode, country and optional phone. We convert the address into map coordinates so we can work out delivery distance and which shops deliver to you."],
          ["Orders and payments", "When you check out", "What you bought, from which shops, prices, delivery or pickup choice, order status and the delivery address used. Card details are entered directly into our payment provider's secure form — we never see or store your card number. We keep the payment status, amount and the provider's reference."],
          ["Your location", "Only when you choose to set it", <>If you tap &ldquo;Use my location&rdquo;, your browser asks your permission first. The location (or a postcode or city you type) is stored only in your browser and sent with your searches to show nearby shops and distances. It is not saved to your account. You can search without sharing any location.</>],
          ["Reviews, wishlist and reports", "When you use these features", "Your rating and review text, saved products, and any report you make about a product or shop."],
          ["Messages to us", "When you use the contact form", "Your name, email, optional phone and order number, and your message."],
          ["Seller information", "When a business registers as a seller", "The owner's name and email, shop name, business address and its map coordinates, phone, opening hours, delivery terms and logo. Shop details are shown publicly on the shop's page."],
          ["Technical data", "When you use the site", "A sign-in token kept in your browser; your IP address, used briefly to protect sign-in and forms from abuse (rate limiting); and server logs of requests (page, status, timing and a request reference). Actions by our staff in the admin system are logged, including their IP address."],
        ]}
      />
    ),
  },
  {
    id: "why",
    title: "Why we use it",
    body: (
      <Bullets
        items={[
          <><strong>To provide the marketplace and your orders</strong> — creating your account, showing prices, delivery options and taxes, taking payment, passing orders to sellers, tracking and customer support (necessary to perform our contract with you).</>,
          <><strong>To show nearby shops</strong> — only when you give us a location (your choice; you can withdraw it at any time by clearing it).</>,
          <><strong>To send service emails</strong> — order confirmation, payment and shipping updates, email confirmation and password resets. These are part of the service; we do not currently send marketing emails or SMS.</>,
          <><strong>To keep the marketplace safe</strong> — rate limiting, fraud prevention by our payment provider, moderating listings, handling reports and enforcing our terms (our legitimate interest in a safe marketplace).</>,
          <><strong>To meet legal obligations</strong> — tax and accounting records for orders and invoices.</>,
        ]}
      />
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We do not sell your personal data, and we do not use advertising or analytics trackers.</p>
        <Bullets
          items={[
            <><strong>Sellers you buy from</strong> receive your name and the items you ordered from them; for delivery orders, also your delivery address and phone number. They do not receive your email address, your payment details, or anything about orders from other shops.</>,
            <><strong>Payment provider (Stripe)</strong> processes card payments and runs fraud checks.</>,
            <><strong>Email provider</strong> delivers our service emails.</>,
            <><strong>Image hosting (Cloudinary)</strong> stores product and shop images uploaded by sellers and staff.</>,
            <><strong>Address lookup (OpenStreetMap Nominatim or a similar geocoding service)</strong> receives the text of an address, postcode or place name — not your identity — to return map coordinates.</>,
            <><strong>Hosting and infrastructure providers</strong> that run our servers and database.</>,
            <><strong>Authorities</strong> where the law requires it.</>,
          ]}
        />
        <p>
          Some of these providers may process data outside your country. Where they do, we rely on
          the safeguards required by applicable data protection law.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <Bullets
        items={[
          "Account details and saved addresses: while your account is open, and deleted or anonymised after you ask us to close it — except what we must keep by law.",
          "Orders, payments and invoices: for as long as tax and accounting law requires.",
          "Password-reset links expire after 1 hour and email-confirmation links after 24 hours.",
          "Your chosen location and cart stay in your browser until you clear them; your sign-in expires automatically.",
        ]}
      />
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Depending on where you live (including under Saudi Arabia&rsquo;s Personal Data
          Protection Law and the UAE&rsquo;s Personal Data Protection Law), you may have the right
          to: access a copy of your data; correct it; have it deleted; object to or restrict some
          uses; withdraw consent you have given; and complain to your data protection authority.
        </p>
        <p>
          You can change your name, email and password, and add or remove addresses, yourself in{" "}
          <A href="/account">your account</A>. For anything else — including closing your account
          or getting a copy of your data — email {mail(LEGAL.privacyEmail)}. We may need to confirm
          your identity before acting on a request.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        Passwords are hashed, sign-in sessions expire, sign-in and forms are rate-limited, staff
        access is restricted by role, each seller can only see its own orders, and card data never
        touches our servers. No system is perfectly secure; if a breach affects you, we will tell you
        and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The marketplace is for people aged {LEGAL.minimumAge} or over. We do not knowingly collect
        data from children; if you believe a child has given us their data, contact us and we will
        delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        We will update this page if our practices change and revise the date at the top; significant
        changes will also be notified by email. Questions: {mail(LEGAL.privacyEmail)}, or{" "}
        <A href="/contact">contact us</A>. See also our <A href="/cookies">Cookie Policy</A> and{" "}
        <A href="/terms">Terms &amp; Conditions</A>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      current="/privacy"
      eyebrow="LEGAL"
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal data {LEGAL.brand} collects when you shop, sell or
          browse, why, who we share it with, and the choices you have. In short: we collect what we
          need to run the marketplace and your orders, we never see your card details, we don&rsquo;t
          sell your data or use advertising trackers, and your location is only used when you choose
          to share it.
        </p>
      }
      sections={sections}
    />
  );
}
