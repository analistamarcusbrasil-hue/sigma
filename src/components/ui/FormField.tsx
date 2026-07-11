import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  description?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
};

export function FormField({ id, label, children, description, error, required, optional, className = "" }: FormFieldProps) {
  return <div className={className}>
    <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-zinc-200">
      <span>{label}</span>
      {required && <span className="text-amber-300" aria-hidden="true">*</span>}
      {optional && <span className="text-xs font-normal text-zinc-500">opcional</span>}
    </label>
    {children}
    {description && !error && <p id={`${id}-description`} className="mt-1.5 text-xs leading-5 text-zinc-500">{description}</p>}
    {error && <p id={`${id}-error`} className="mt-1.5 text-xs leading-5 text-red-300" role="alert">{error}</p>}
  </div>;
}
