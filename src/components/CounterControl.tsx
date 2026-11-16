interface CounterControlProps {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Optional egg-shaped colour swatch shown before the label. */
  swatch?: string;
}

const stepButton =
  'grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-lg bg-page text-ink select-none hover:bg-divider active:bg-line disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-page';

/** Drawn − / + so both sit exactly centred and match in weight. */
function StepIcon({ plus }: { plus: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d={plus ? 'M8 3v10M3 8h10' : 'M3 8h10'} />
    </svg>
  );
}

/** Stepper row: label, − count +. Place several inside a list card; rows draw their own dividers. */
export default function CounterControl({ label, value, onDecrement, onIncrement, swatch }: CounterControlProps) {
  return (
    <div className="flex items-center gap-3 border-t border-divider py-1.5 pr-2 pl-3.5 first:border-t-0">
      {swatch && (
        <span
          className="h-[15px] w-3 flex-none rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-[inset_0_0_0_1px_rgba(24,24,27,.2)]"
          style={{ background: swatch }}
        />
      )}
      <span className="flex-1 text-sm">{label}</span>
      {/* Can't go below zero: − is disabled at 0. */}
      <button type="button" onClick={onDecrement} disabled={value <= 0} aria-label={`Less ${label}`} className={stepButton}>
        <StepIcon plus={false} />
      </button>
      <span className="w-8 text-center font-mono text-xl font-medium text-ink tabular-nums">{value}</span>
      <button type="button" onClick={onIncrement} aria-label={`More ${label}`} className={stepButton}>
        <StepIcon plus />
      </button>
    </div>
  );
}
