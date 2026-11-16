import { formatEUR, formatSignedEUR } from '../utils/format';

interface NetResultCardProps {
  /** e.g. "November" or "this year" */
  periodLabel: string;
  income: number;
  expense: number;
}

/** Dark hero card: net result, income/expense ratio bar and the two totals. */
export default function NetResultCard({ periodLabel, income, expense }: NetResultCardProps) {
  const total = income + expense;
  const incomeShare = total ? (income / total) * 100 : 50;

  return (
    <section className="flex flex-col gap-[18px] rounded-[14px] bg-ink p-5 text-app">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-on-dark-muted">Net result · {periodLabel}</span>
        <span className="font-mono text-[38px] font-medium tracking-[-.03em] tabular-nums">
          {formatSignedEUR(income - expense)}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-[3px] bg-expense-on-dark">
        <div className="bg-income-on-dark" style={{ width: `${incomeShare}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-on-dark-muted">
            <span className="h-2 w-2 rounded-xs bg-income-on-dark" />
            Income
          </span>
          <span className="font-mono text-[17px] tabular-nums">{formatEUR(income)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-on-dark-muted">
            <span className="h-2 w-2 rounded-xs bg-expense-on-dark" />
            Expenses
          </span>
          <span className="font-mono text-[17px] tabular-nums">{formatEUR(expense)}</span>
        </div>
      </div>
    </section>
  );
}
