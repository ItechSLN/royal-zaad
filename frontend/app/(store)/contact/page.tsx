'use client';

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CircleCheck,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
} from "lucide-react";
import Breadcrumbs from "@/components/store/common/Breadcrumbs";
import SectionHeading from "@/components/store/common/SectionHeading";
import {
  sendContactMessage,
  type ContactTopic,
} from "@/services/contact.service";
import { SITE_CONTACT } from "@/lib/site-contact";

const TOPICS: { value: ContactTopic; label: string }[] = [
  { value: "ORDER", label: "An order" },
  { value: "PRODUCT", label: "A product or harvest" },
  { value: "RETURNS", label: "Returns & refunds" },
  { value: "WHOLESALE", label: "Wholesale & corporate gifting" },
  { value: "PRESS", label: "Press & partnerships" },
  { value: "OTHER", label: "Something else" },
];

const CHANNELS = [
  { icon: Phone, label: "CONCIERGE", value: SITE_CONTACT.phone, note: SITE_CONTACT.phoneNote },
  { icon: Mail, label: "EMAIL", value: SITE_CONTACT.email, note: SITE_CONTACT.emailNote },
  { icon: MapPin, label: "THE MAISON", value: SITE_CONTACT.address, note: SITE_CONTACT.addressNote },
  { icon: Clock, label: "DISPATCH", value: SITE_CONTACT.dispatch, note: SITE_CONTACT.dispatchNote },
];

const FIELD_LABEL =
  "font-body text-[10.5px] font-bold tracking-[1px] text-[var(--ink-muted)]";
const FIELD_BOX =
  "flex items-center gap-3 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[14px] transition focus-within:border-[var(--gold)]";
const INPUT =
  "w-full bg-transparent font-body text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  topic: "ORDER" as ContactTopic,
  orderNumber: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        topic: form.topic,
        orderNumber: form.orderNumber.trim() || undefined,
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
      });

      setSent(true);
      setForm(EMPTY);
      toast.success("Message sent — we will be in touch shortly.");
    } catch (err) {
      // The API returns field-level errors in the same shape the forms use.
      const api = err as { errors?: Record<string, string>; message?: string };
      setErrors(api?.errors ?? {});
      toast.error(api?.message ?? "Unable to send your message right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-8 lg:px-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      </div>

      {/* Head */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-6 pb-10 pt-6 lg:px-12">
        <p className="font-body text-[10px] font-bold tracking-[3px] text-[var(--gold-deep)]">
          CUSTOMER CARE
        </p>
        <h1 className="font-display text-[46px] leading-tight text-[var(--ink)]">
          How can we help?
        </h1>
        <p className="max-w-[620px] font-body text-[13px] leading-[1.9] text-[var(--ink-muted)]">
          A note about an order, a question about a harvest, or a wholesale enquiry —
          the concierge team reads every message and replies within one working day.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-6 pb-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:px-12">
        {/* Form */}
        <div className="flex flex-col gap-6 border border-[var(--border)] bg-[var(--surface)] p-6 lg:p-8">
          {sent ? (
            <div className="flex flex-col items-start gap-4 py-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-bg)]">
                <CircleCheck size={22} className="text-[var(--gold-deep)]" />
              </span>
              <h2 className="font-display text-[28px] text-[var(--ink)]">
                Thank you — your message is with us
              </h2>
              <p className="font-body text-[13px] leading-[1.8] text-[var(--ink-muted)]">
                A member of the concierge team will reply to your email within one
                working day. For anything urgent about a delivery in progress, call
                {SITE_CONTACT.phone}.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="rounded-[2px] border border-[var(--border-strong)] px-5 py-3 font-body text-[12px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
                >
                  Send another message
                </button>
                <Link
                  href="/products"
                  className="rounded-[2px] bg-[var(--ink)] px-5 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-[7px]">
                  <span className={FIELD_LABEL}>YOUR NAME</span>
                  <div className={FIELD_BOX}>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Noor Al Amin"
                      className={INPUT}
                    />
                  </div>
                  {errors.name && (
                    <span className="font-body text-[10.5px] text-[var(--danger)]">
                      {errors.name}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-[7px]">
                  <span className={FIELD_LABEL}>EMAIL ADDRESS</span>
                  <div className={FIELD_BOX}>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="noor@example.com"
                      className={INPUT}
                    />
                    <Mail size={15} className="shrink-0 text-[var(--ink-muted)]" />
                  </div>
                  {errors.email && (
                    <span className="font-body text-[10.5px] text-[var(--danger)]">
                      {errors.email}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-[7px]">
                  <span className={FIELD_LABEL}>PHONE · OPTIONAL</span>
                  <div className={FIELD_BOX}>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+966 55 214 8890"
                      className={INPUT}
                    />
                    <Phone size={15} className="shrink-0 text-[var(--ink-muted)]" />
                  </div>
                </label>

                <label className="flex flex-col gap-[7px]">
                  <span className={FIELD_LABEL}>WHAT IS THIS ABOUT?</span>
                  <div className={FIELD_BOX}>
                    <select
                      value={form.topic}
                      onChange={(e) => set("topic", e.target.value)}
                      className={`${INPUT} cursor-pointer`}
                    >
                      {TOPICS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              {/* Only relevant when the enquiry is about an order. */}
              {form.topic === "ORDER" || form.topic === "RETURNS" ? (
                <label className="flex flex-col gap-[7px]">
                  <span className={FIELD_LABEL}>ORDER NUMBER · OPTIONAL</span>
                  <div className={FIELD_BOX}>
                    <input
                      value={form.orderNumber}
                      onChange={(e) => set("orderNumber", e.target.value)}
                      placeholder="AM-2026-04871"
                      className={`${INPUT} font-mono`}
                    />
                  </div>
                  <span className="font-body text-[10.5px] text-[var(--ink-muted)]">
                    Quoting it lets us answer without a second email.
                  </span>
                </label>
              ) : null}

              <label className="flex flex-col gap-[7px]">
                <span className={FIELD_LABEL}>SUBJECT · OPTIONAL</span>
                <div className={FIELD_BOX}>
                  <input
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    placeholder="Delivery window for Thursday"
                    className={INPUT}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-[7px]">
                <span className={FIELD_LABEL}>MESSAGE</span>
                <div className={`${FIELD_BOX} items-start`}>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="Tell us how we can help…"
                    className={`${INPUT} resize-y`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  {errors.message ? (
                    <span className="font-body text-[10.5px] text-[var(--danger)]">
                      {errors.message}
                    </span>
                  ) : (
                    <span className="font-body text-[10.5px] text-[var(--ink-muted)]">
                      A little detail helps us reply properly first time.
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                    {form.message.length}/4000
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[2px] bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] px-[34px] py-[15px] font-body text-[12px] font-bold tracking-[1.8px] text-[var(--noir)] transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:self-start"
              >
                {submitting ? "SENDING…" : "SEND MESSAGE"}
              </button>

              <p className="font-body text-[10.5px] leading-[1.6] text-[var(--ink-muted)]">
                We use your details only to answer this enquiry — see our{" "}
                <Link href="#" className="font-semibold text-[var(--gold-deep)]">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          )}
        </div>

        {/* Channels */}
        <aside className="flex flex-col gap-4">
          {CHANNELS.map((c) => (
            <div
              key={c.label}
              className="flex gap-4 border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] bg-[var(--cream-2)]">
                <c.icon size={16} className="text-[var(--gold-deep)]" />
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
                  {c.label}
                </span>
                <span className="font-body text-[13px] font-semibold text-[var(--ink)]">
                  {c.value}
                </span>
                <span className="font-body text-[11px] leading-[1.6] text-[var(--ink-muted)]">
                  {c.note}
                </span>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 border border-[var(--gold)] bg-[var(--warning-bg)] p-5">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-[var(--gold-deep)]" />
              <span className="font-body text-[12px] font-semibold text-[var(--ink)]">
                Tracking a delivery?
              </span>
            </div>
            <p className="font-body text-[11.5px] leading-[1.7] text-[var(--ink-muted)]">
              Order status, carrier and delivery window are on your tracking page — often
              faster than waiting on a reply.
            </p>
            <Link
              href="/account/orders"
              className="font-body text-[11.5px] font-bold text-[var(--gold-deep)] hover:underline"
            >
              Track an order →
            </Link>
          </div>
        </aside>
      </div>

      {/* Reassurance strip */}
      <section className="border-t border-[var(--border)] bg-[var(--cream-2)] px-6 py-14 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-8">
          <SectionHeading eyebrow="Before you write" title="Answered in Seconds" />
          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                q: "Where is my order?",
                a: "Every order has a live tracking page with the carrier and delivery window.",
                href: "/account/orders",
                cta: "Track an order",
              },
              {
                q: "How do returns work?",
                a: "30 days, free collection, refunded to the original payment or as store credit. Message us and we will arrange it.",
                href: "/contact",
                cta: "Request a return",
              },
              {
                q: "Do you ship outside the GCC?",
                a: "Yes — 3 to 5 working days across the wider Middle East, calculated at checkout.",
                href: "/products",
                cta: "Browse the shop",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-6"
              >
                <h3 className="font-display text-[19px] text-[var(--ink)]">{item.q}</h3>
                <p className="flex-1 font-body text-[12px] leading-[1.8] text-[var(--ink-muted)]">
                  {item.a}
                </p>
                <Link
                  href={item.href}
                  className="font-body text-[11.5px] font-bold text-[var(--gold-deep)] hover:underline"
                >
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
