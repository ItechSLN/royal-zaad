/** C/Gold Rule Ornament — hairline, centred diamond, hairline. */
export default function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-[220px] items-center gap-[10px] ${className}`}>
      <span className="h-px flex-1 bg-[var(--gold-deep)]" />
      <span className="h-[8px] w-[8px] rotate-45 bg-[var(--gold)]" />
      <span className="h-px flex-1 bg-[var(--gold-deep)]" />
    </div>
  );
}
