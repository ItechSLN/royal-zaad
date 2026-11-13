type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--noir)]/60 p-4">
      <div className="w-full max-w-md rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-display text-[22px] font-semibold text-[var(--ink)]">{title}</h2>
        <p className="mt-3 whitespace-pre-line font-body text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[22px] py-[11px] font-body text-[12px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[2px] border border-[var(--danger)] bg-[var(--danger)] px-[22px] py-[11px] font-body text-[12px] font-semibold text-[var(--cream)] transition hover:opacity-90"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
