import React from 'react';
import { inputClass } from './uiStyles';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function FormInput({
  label,
  error,
  className = '',
  ...props
}: FormInputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <input className={`${inputClass} ${className}`} {...props} />
      {error && <span className="text-xs text-expense">{error}</span>}
    </label>
  );
}
