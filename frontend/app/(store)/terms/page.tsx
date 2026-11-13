import type { Metadata } from "next";
import LegalPage, { A, Bullets, type LegalSection } from "@/components/store/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms for buying and selling on the ${LEGAL.brand} marketplace.`,
};

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About these terms",
    body: (
      <>
        <p>
          These terms apply when you use the {LEGAL.brand} marketplace, operated by{" "}
          {LEGAL.companyName} (Commercial Registration {LEGAL.commercialRegistration}, VAT{" "}
          {LEGAL.vatNumber}), {LEGAL.registeredAddress} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By
          creating an account or placing an order you agree to them, and to our{" "}
          <A href="/privacy">Privacy Policy</A>.
        </p>
        <p>
          Nothing in these terms limits rights you have under consumer protection law that cannot be
          excluded.
        </p>
      </>
    ),
  },
  {
    id: "marketplace",
    title: "How the marketplace works",
    body: (
      <>
        <p>
          {LEGAL.brand} brings together independent shops (&ldquo;sellers&rdquo;) and our own{" "}
          {LEGAL.brand} shop in one catalogue. Each product page and your basket show which shop sells
          each item. When you buy from a seller, your contract of sale is with that seller; we run the
          platform, take payment on the seller&rsquo;s behalf and handle customer support.
        </p>
        <p>
          Sellers must be approved by us before they can sell, and we may review, hide or remove
          listings that break these terms or the law.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <Bullets
        items={[
          `You must be ${LEGAL.minimumAge} or over and give accurate details, including a valid email address.`,
          "Keep your password private. You are responsible for activity on your account; tell us straight away if you think someone else has used it.",
          "For your security, sign-ins expire automatically and repeated sign-in attempts are temporarily blocked.",
          "We may suspend or close accounts used fraudulently, abusively or in breach of these terms.",
        ]}
      />
    ),
  },
  {
    id: "prices",
    title: "Prices, tax and delivery charges",
    body: (
      <Bullets
        items={[
          "Prices are shown in US dollars (USD) and exclude tax. Tax is added at checkout based on the country you're delivering to, and shown before you pay.",
          "Each shop sets its own delivery fee and free-delivery threshold. Collecting your order from the shop (where offered) is free.",
          "Discounts from promotions and coupons are applied at checkout under their stated conditions; a coupon applies to your whole basket and is shared across the shops in it.",
          "The total shown at checkout is the amount you will be charged. If a price is shown in clear error, we or the seller may cancel the affected order and refund you in full.",
        ]}
      />
    ),
  },
  {
    id: "orders",
    title: "Placing an order",
    body: (
      <>
        <p>
          One checkout can include products from several shops. You pay once; each shop then
          prepares and sends — or hands over — its own part of the order, and you can follow each
          part&rsquo;s progress in <A href="/account/orders">your orders</A>.
        </p>
        <Bullets
          items={[
            "Your order is accepted once we confirm it after checkout. Stock is reserved when you place the order.",
            "A shop may only deliver within a set distance of its location. If your address is outside it, you'll be told at checkout and can choose pickup instead, where offered.",
            "Card orders that are not paid within 60 minutes are cancelled automatically and the stock is released.",
          ]}
        />
      </>
    ),
  },
  {
    id: "payment",
    title: "Payment",
    body: (
      <Bullets
        items={[
          "Card payments are processed securely by our payment provider (Stripe); your card details are never sent to us or to sellers. Your bank may ask you to confirm the payment (3-D Secure).",
          "With cash on delivery, you pay the courier or the shop when you receive your order.",
          "We collect payment on behalf of the sellers in your order.",
        ]}
      />
    ),
  },
  {
    id: "delivery",
    title: "Delivery and pickup",
    body: (
      <Bullets
        items={[
          "Delivery times shown are estimates. Each shop is responsible for dispatching its part of your order.",
          "For pickup, the shop will mark your order ready for collection; please collect it during the shop's opening hours shown on its page.",
          "Risk in the products passes to you when they are delivered to you or collected.",
        ]}
      />
    ),
  },
  {
    id: "cancellations",
    title: "Cancellations, returns and refunds",
    body: (
      <Bullets
        items={[
          "You can ask to cancel an order, or the part of it from one shop, until it has been shipped or handed over. Contact us as soon as possible.",
          "A shop may cancel its part of an order — for example if an item is unavailable. You will be refunded for that part only; the rest of your order continues.",
          <>You can start a return within {LEGAL.returnWindowDays} days of delivery by <A href="/contact">contacting us</A>. Items must be returned in the condition received; some items (for example opened food, personal-care products or made-to-measure items) can&rsquo;t be returned unless faulty, as permitted by law.</>,
          "Refunds go back to your original payment method once a cancellation is confirmed or a return is accepted. Your bank may take a few days to show it.",
          "Faulty or incorrect items will be replaced or refunded in line with your legal rights.",
        ]}
      />
    ),
  },
  {
    id: "reviews",
    title: "Reviews and reports",
    body: (
      <Bullets
        items={[
          "You can review products you have bought. Reviews are checked before they appear and must be honest, lawful and about the product.",
          "You can report a product or shop you believe is counterfeit, prohibited, misleading, offensive or fraudulent. We review reports and may remove listings or suspend sellers.",
        ]}
      />
    ),
  },
  {
    id: "sellers",
    title: "Additional terms for sellers",
    body: (
      <>
        <p>If you sell on {LEGAL.brand}, you also agree that:</p>
        <Bullets
          items={[
            "You will confirm your email address and give accurate business details, including a real shop address. We approve sellers before they can sell and may reject, suspend or close a shop.",
            "Your listings will be accurate, lawful and your own to sell, with correct prices, stock and images. We may require listings to be approved before they appear, and may reject or remove them.",
            "You will fulfil orders promptly, keep order status up to date, honour your stated delivery area, pickup arrangements and opening hours, and handle customer data only to fulfil orders.",
            "We charge a commission on the value of goods you sell (after discounts), at the rate agreed with you or our published platform rate. Your earnings from an order become payable once it has been delivered and paid for, and are paid to you, less commission, in periodic payouts.",
            "You are responsible for your own taxes and for complying with the laws that apply to your products.",
          ]}
        />
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <p>
        Don&rsquo;t misuse the marketplace — for example by attempting to access other people&rsquo;s
        accounts or data, interfering with the site, scraping it at scale, posting unlawful content,
        or placing fraudulent orders.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Our liability",
    body: (
      <>
        <p>
          We take reasonable care to keep the marketplace available and accurate, but we can&rsquo;t
          guarantee it will always be uninterrupted or error-free. Sellers are responsible for their
          products and their descriptions.
        </p>
        <p>
          To the extent permitted by law, we are not liable for indirect or unforeseeable losses. We
          do not exclude liability where doing so would be unlawful.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Changes, law and contact",
    body: (
      <p>
        We may update these terms; the version in force when you place an order applies to that
        order. These terms are governed by the laws of {LEGAL.governingLaw}, and disputes are subject
        to {LEGAL.courts}, without affecting any mandatory consumer rights you have where you live.
        Questions: <A href="/contact">contact us</A> or email {LEGAL.supportEmail}.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      current="/terms"
      eyebrow="LEGAL"
      title="Terms & Conditions"
      intro={
        <p>
          These terms explain how buying and selling works on {LEGAL.brand}: who you&rsquo;re buying
          from, how prices, payment and delivery work, how to cancel or return, and what we expect of
          sellers.
        </p>
      }
      sections={sections}
    />
  );
}
