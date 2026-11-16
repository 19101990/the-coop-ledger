import { useEffect } from 'react';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Take the whole screen (height of the viewport, width of the app column) instead of a bottom sheet. */
  fullScreen?: boolean;
}

/** Bottom sheet (or full-screen panel): dimmed backdrop, panel in the app column. */
export default function Sheet({ open, title, onClose, children, fullScreen = false }: SheetProps) {
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
        className={`relative flex w-full max-w-[440px] flex-col gap-[18px] overflow-y-auto bg-app px-5 pb-[calc(20px+env(safe-area-inset-bottom))] ${
          fullScreen
            ? 'h-[100dvh] pt-[calc(14px+env(safe-area-inset-top))]'
            : 'max-h-[92vh] rounded-t-[18px] pt-2.5'
        }`}
      >
        {/* Grab handle only on bottom sheets */}
        {/* Pulled closer to the title than the normal section spacing. */}
        {!fullScreen && <span className="-mb-2.5 h-1 w-9 flex-none self-center rounded-sm bg-edge" />}
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-1 text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
          >
            <svg viewBox="0 0 20 20" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
