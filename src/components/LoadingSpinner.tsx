interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md'
}: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'p-3.5 text-[13px]',
    md: 'p-6 text-sm',
    lg: 'p-8 text-[15px]'
  }[size];

  return (
    <div className={`text-center text-muted ${sizeClass}`}>
      {message}
    </div>
  );
}
