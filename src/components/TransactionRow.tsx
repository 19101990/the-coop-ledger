import type { TransactionEntry } from '../types/types';
import { formatDayMonthMaybeYear, formatEUR, formatSignedEUR } from '../utils/format';
import { signedAmount } from '../utils/transactions';

interface TransactionRowProps {
  tx: TransactionEntry;
  /** Running balance after this entry; adds a Balance column when given. */
  balance?: number;
  /** Makes the row tappable (e.g. to open details). */
  onClick?: () => void;
}

/**
 * One ledger entry: bold category, then date and full description in small print,
 * signed amount (and optionally the running balance) on the right.
 * Used by the Ledger list and Overview's recent entries so both look the same.
 */
export default function TransactionRow({ tx, balance, onClick }: TransactionRowProps) {
  const withBalance = balance !== undefined;
  // Line 1: category | amount | (balance). Line 2: date · description across the full width.
  const className = `grid w-full items-baseline gap-x-3 gap-y-0.5 border-t border-divider px-3.5 py-3 text-left first:border-t-0 ${
    withBalance ? 'grid-cols-[minmax(0,1fr)_auto_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'
  } ${onClick ? 'cursor-pointer hover:bg-app' : ''}`;

  const content = (
    <>
      <span className="min-w-0 truncate text-sm font-semibold">{tx.category}</span>
      <span
        className={`min-w-[76px] text-right font-mono text-sm tabular-nums ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}
      >
        {formatSignedEUR(signedAmount(tx))}
      </span>
      {withBalance && (
        <span className="min-w-[76px] text-right font-mono text-xs text-muted tabular-nums">{formatEUR(balance)}</span>
      )}
      <span className="col-span-full text-xs break-words text-muted">
        {formatDayMonthMaybeYear(tx.date)}
        {tx.description ? ` · ${tx.description}` : ''}
      </span>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}
