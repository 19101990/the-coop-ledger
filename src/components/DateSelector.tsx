import { useEffect } from 'react';

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

    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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

  return (
    <div className='mb-6'>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePreviousDay}
          className="w-10 h-10 flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg border border-stone-200 transition-colors shadow-xs"
          title="Go to previous day"
        >
          ←
        </button>
        <div className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-center">
          <p className="text-sm font-semibold text-stone-800">{formatDisplayDate(value)}</p>
        </div>
        <button
          type="button"
          onClick={handleNextDay}
          disabled={isRightArrowDisabled()}
          className="w-10 h-10 flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg border border-stone-200 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          title="Go to next day"
        >
          →
        </button>
      </div>
    </div>
  );
}
