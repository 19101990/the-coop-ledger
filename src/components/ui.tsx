import React from 'react';

/* Small presentational building blocks shared by every page (see design/README.md). */

// ---------- Layout ----------

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface ${padded ? 'p-4' : 'overflow-hidden'} ${className}`}>
      {children}
    </div>
  );
}

/** Titled block: 15px heading with an optional action link or note on the right. */
export function Section({
  title,
  action,
  aside,
  control,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  aside?: React.ReactNode;
  /** Small control on the heading line, e.g. a ScopeToggle. */
  control?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className={`flex justify-between gap-3 ${control ? 'items-center' : 'items-baseline'}`}>
        <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
        {action && <TextButton onClick={action.onClick}>{action.label}</TextButton>}
        {aside && <span className="text-xs text-muted">{aside}</span>}
        {control}
      </div>
      {children}
    </section>
  );
}

/** Label (12px, muted) above a control, with an optional right-hand slot. */
export function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted">{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

// ---------- Buttons ----------

export function PrimaryButton({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`h-[52px] w-full cursor-pointer rounded-xl bg-ink text-base font-medium text-app active:bg-ink-pressed disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}

type TextButtonTone = 'muted' | 'ink' | 'danger';
const TONES: Record<TextButtonTone, string> = {
  muted: 'text-muted hover:text-ink',
  ink: 'font-medium text-ink underline underline-offset-[3px]',
  danger: 'text-expense hover:underline underline-offset-[3px]',
};

export function TextButton({
  tone = 'muted',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: TextButtonTone }) {
  return (
    <button
      type="button"
      className={`cursor-pointer bg-transparent py-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40 ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}

/** Segmented control: grey track with the active option raised. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-page p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`flex-1 cursor-pointer rounded-md ${compact ? 'h-8 text-[13px]' : 'h-[38px] text-sm'} ${
              active ? 'bg-surface font-semibold text-ink' : 'font-normal text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact two-or-three-way switch that fits on a section heading line. */
export function ScopeToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name, e.g. "Customers period". */
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md bg-page p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`h-6 cursor-pointer rounded px-2 text-[11px] ${
              active ? 'bg-surface font-medium text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Form controls ----------

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`h-11 w-full appearance-none rounded-lg border border-edge bg-app pr-9 pl-3 text-[15px] text-ink outline-none focus:border-ink ${className}`}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute top-3 right-3.5 text-xs text-muted">▾</span>
    </div>
  );
}

// ---------- Display ----------

/** Small card with a label and a big mono number. */
export function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-xl font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="m-0 p-3.5 text-sm text-muted">{children}</p>;
}
