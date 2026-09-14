import React from 'react';

interface CollapsibleSectionProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function CollapsibleSection({
  isOpen,
  onToggle,
  children,
  disabled = false
}: CollapsibleSectionProps) {
  return (
    <>
      <button
        onClick={() => !disabled && onToggle(!isOpen)}
        disabled={disabled}
        className="flex items-center space-x-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{isOpen ? 'Close' : 'Open'}</span>
        <span>{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="animate-fade-in">
          {children}
        </div>
      )}
    </>
  );
}
