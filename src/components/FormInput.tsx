import React from 'react';

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
    <div>
      {label && (
        <label className="block text-xs font-medium text-stone-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
