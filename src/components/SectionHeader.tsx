interface SectionHeaderProps {
  title: string;
  description?: string;
  emoji?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function SectionHeader({
  title,
  description,
  emoji,
  action
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-2 mb-4">
      <div>
        <h2 className="text-lg font-bold text-stone-900 mb-1">
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h2>
        {description && (
          <p className="text-stone-500 text-sm">{description}</p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="text-xs mb-5 text-amber-700 font-medium hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
