interface CounterControlProps {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Optional egg-shaped colour swatch shown before the label. */
  swatch?: string;
}

/** Stepper row: label, − count +. Place several inside a list card; rows draw their own dividers. */
export default function CounterControl({ label, value, onDecrement, onIncrement, swatch }: CounterControlProps) {
  return (
    <div className="flex items-center gap-3 border-t border-divider py-1 pr-1.5 pl-3.5 first:border-t-0">
      {swatch && (
        <span
          className="h-[15px] w-3 flex-none rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-[inset_0_0_0_1px_rgba(28,27,24,.2)]"
          style={{ background: swatch }}
        />
      )}
      <span className="flex-1 text-sm">{label}</span>
      <button
        type="button"
        onClick={onDecrement}
        aria-label={`Less ${label}`}
        className="h-11 w-11 cursor-pointer rounded-lg bg-transparent text-lg text-muted select-none active:bg-subtle"
      >
        −
      </button>
      <span className={`w-7 text-center font-mono text-base font-medium tabular-nums ${value ? 'text-ink' : 'text-faint'}`}>
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`More ${label}`}
        className="h-11 w-11 cursor-pointer rounded-lg bg-subtle text-lg text-ink select-none active:bg-line"
      >
        +
      </button>
    </div>
  );
}
