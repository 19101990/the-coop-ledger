// Shared Tailwind class strings for form controls (see design/README.md tokens).

const inputBase =
  'h-11 w-full rounded-lg border border-edge px-3 text-[15px] text-ink outline-none focus:border-ink disabled:opacity-50';

/** Input inside a white card: softly filled so it stands out from the card. */
export const inputClass = `${inputBase} bg-app`;

/** Input sitting directly on the grey page background (e.g. Ledger search): white. */
export const inputOnPageClass = `${inputBase} bg-surface`;

export const textareaClass =
  'w-full rounded-lg border border-edge bg-app px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink';

/** Divider between rows inside a list card. */
export const rowDivider = 'border-t border-divider first:border-t-0';
