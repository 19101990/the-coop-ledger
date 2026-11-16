import React from 'react';
import { inputClass, inputOnPageClass } from './uiStyles';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** True when the input sits on the grey page/sheet background rather than in a white card: makes it white. */
  onPage?: boolean;
}

export default function FormInput({
  label,
  error,
  onPage = false,
  className = '',
  ...props
}: FormInputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <input className={`${onPage ? inputOnPageClass : inputClass} ${className}`} {...props} />
      {error && <span className="text-xs text-expense">{error}</span>}
    </label>
  );
}
