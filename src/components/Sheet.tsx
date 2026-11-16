import { useEffect } from 'react';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Bottom sheet: dimmed backdrop, panel slides up from the bottom of the app column. */
export default function Sheet({ open, title, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Stop the page behind the sheet from scrolling.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92vh] w-full max-w-[440px] flex-col gap-[18px] overflow-y-auto rounded-t-[18px] bg-app px-5 pt-2.5 pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <span className="h-1 w-9 self-center rounded-sm bg-edge" />
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-1 text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="cursor-pointer py-2 text-sm text-muted hover:text-ink">
            Cancel
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
