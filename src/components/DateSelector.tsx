import { useEffect } from 'react';
import { formatFullDate, formatWeekdayDate, todayLocal, toLocalISODate } from '../utils/format';
import { Chevron } from './ui';

interface DateSelectorProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}

export default function DateSelector({
  value,
  onChange,
  label = 'Date'
}: DateSelectorProps) {
  // Both in local time, so "Today" and "Yesterday" agree just after midnight too.
  const getTodayString = todayLocal;
  const formatDateToString = toLocalISODate;

  const formatDisplayDate = (dateStr: string): string => {
    const today = getTodayString();

    if (dateStr === today) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToString(yesterday);
    if (dateStr === yesterdayStr) return 'Yesterday';

    return dateStr.slice(0, 4) === String(new Date().getFullYear())
      ? formatWeekdayDate(dateStr)
      : formatFullDate(dateStr);
  };

  const handlePreviousDay = (): void => {
    const [year, month, day] = value.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() - 1);
    const newDateStr = formatDateToString(current);
    onChange(newDateStr);
  };

  const handleNextDay = (): void => {
    const [year, month, day] = value.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() + 1);
    const newDateStr = formatDateToString(current);
    const today = getTodayString();

    if (newDateStr <= today) {
      onChange(newDateStr);
    }
  };

  const isRightArrowDisabled = (): boolean => {
    return value >= getTodayString();
  };

  useEffect(() => {
    if (!value) {
      const today = getTodayString();
      onChange(today);
    }
  }, []);

  // Grid + drawn chevron so the arrow sits exactly in the middle of the button.
  const arrowClass =
    'grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-lg border border-edge bg-surface text-ink hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-surface';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>

      <div className="flex items-center gap-2">
        <button type="button" onClick={handlePreviousDay} className={arrowClass} aria-label="Previous day">
          <Chevron size={20} className="rotate-90" />
        </button>
        <span className="grid h-11 flex-1 place-items-center rounded-lg border border-edge bg-surface text-sm font-medium">
          {value ? formatDisplayDate(value) : '—'}
        </span>
        <button
          type="button"
          onClick={handleNextDay}
          disabled={isRightArrowDisabled()}
          className={arrowClass}
          aria-label="Next day"
        >
          <Chevron size={20} className="-rotate-90" />
        </button>
      </div>
    </div>
  );
}
