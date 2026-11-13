/**
 * The Zaad Letter teaser. There is no mailing list yet, so this collects no
 * email addresses — swap in a real sign-up (with recorded consent and an
 * unsubscribe link) when the newsletter launches, and update the Privacy Policy.
 */
export default function Newsletter() {
  return (
    <section className="bg-[var(--ink)] px-6 py-14 lg:px-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <p className="font-body text-[10px] font-semibold tracking-[3px] text-[var(--gold)]">
          THE ZAAD LETTER
        </p>
        <h2 className="font-display text-[34px] leading-tight text-[var(--cream)] sm:text-[40px]">
          Private harvests, first.
        </h2>
        <p className="max-w-lg font-body text-[13px] leading-relaxed text-[var(--text-muted-dark)]">
          Early access to seasonal editions, limited lots and the stories behind them.
        </p>
        <p className="mt-2 border border-[var(--hairline)] px-5 py-3 font-body text-[12px] tracking-[1px] text-[var(--text-on-dark)]">
          Launching soon.
        </p>
      </div>
    </section>
  );
}
