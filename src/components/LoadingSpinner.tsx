interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md'
}: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'p-3 text-xs',
    md: 'p-6 text-sm',
    lg: 'p-8 text-base'
  }[size];

  return (
    <div className={`text-center text-stone-500 animate-pulse ${sizeClass}`}>
      {message}
    </div>
  );
}
