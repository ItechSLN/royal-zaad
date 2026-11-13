import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL, LEGAL_LINKS } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: ReactNode };

/**
 * Shared layout for the legal pages: title, last-updated date, a contents list
 * that links to each section, the sections, and links to the other policies.
 */
export default function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
  current,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <div className="bg-[var(--cream)]">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:gap-14 lg:px-12 lg:py-16">
        <aside className="lg:w-[240px] lg:shrink-0">
          <nav aria-label="On this page" className="lg:sticky lg:top-28">
            <p className="font-body text-[10px] font-bold tracking-[2px] text-[var(--gold-deep)]">
              ON THIS PAGE
            </p>
            <ol className="mt-4 flex flex-col gap-2.5">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="font-body text-[12.5px] leading-[1.5] text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>

            <p className="mt-8 font-body text-[10px] font-bold tracking-[2px] text-[var(--gold-deep)]">
              POLICIES
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={link.href === current ? "page" : undefined}
                    className={`font-body text-[12.5px] transition hover:text-[var(--ink)] ${
                      link.href === current
                        ? "font-semibold text-[var(--ink)]"
                        : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 flex-1">
          <p className="font-body text-[10px] font-bold tracking-[3px] text-[var(--gold-deep)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[36px] leading-tight text-[var(--ink)] sm:text-[44px]">
            {title}
          </h1>
          <p className="mt-3 font-body text-[12px] text-[var(--ink-muted)]">
            Last updated {LEGAL.lastUpdated}
          </p>
          <div className="mt-6 font-body text-[14.5px] leading-[1.8] text-[var(--ink)]">{intro}</div>

          <div className="mt-10 flex flex-col gap-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="font-display text-[24px] leading-snug text-[var(--ink)]">
                  {index + 1}. {section.title}
                </h2>
                <div className="legal-body mt-3 flex flex-col gap-3 font-body text-[14.5px] leading-[1.8] text-[var(--ink)]">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

/** A bulleted list styled for the legal pages. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-[var(--gold-deep)]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** A simple, accessible table for the legal pages. */
export function LegalTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--cream-2)]">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold text-[var(--ink)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] align-top last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 leading-[1.6] text-[var(--ink)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** An inline link inside policy text. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  return external ? (
    <a href={href} className="text-[var(--gold-deep)] underline underline-offset-2" {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  ) : (
    <Link href={href} className="text-[var(--gold-deep)] underline underline-offset-2">
      {children}
    </Link>
  );
}
