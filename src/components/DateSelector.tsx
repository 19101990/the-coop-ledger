import { useEffect } from 'react';
import { formatFullDate, formatWeekdayDate } from '../utils/format';

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
  const getTodayString = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatDateToString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

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

  const arrowClass =
    'h-11 w-11 flex-none cursor-pointer rounded-lg border border-edge bg-surface text-lg text-ink-soft hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-35';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>

      <div className="flex items-center gap-2">
        <button type="button" onClick={handlePreviousDay} className={arrowClass} aria-label="Previous day">
          ‹
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
          ›
        </button>
      </div>
    </div>
  );
}
