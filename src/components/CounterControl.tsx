interface CounterControlProps {
  label: string;
  description: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

export default function CounterControl({
  label,
  description,
  value,
  onDecrement,
  onIncrement
}: CounterControlProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-150">
      <div>
        <p className="font-semibold text-stone-800">{label}</p>
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">{description}</p>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={onDecrement}
          className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
        >
          -
        </button>
        <span className="w-8 text-center font-bold text-lg text-stone-900">{value}</span>
        <button
          onClick={onIncrement}
          className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
