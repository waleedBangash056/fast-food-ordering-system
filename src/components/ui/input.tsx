import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name || React.useId();

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl bg-[var(--surface-dark)] px-4 py-3 text-sm text-[var(--cream)] placeholder:text-neutral-500 border border-[var(--border-glass)] transition-colors focus:border-[var(--accent-orange)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-orange)]",
            error && "border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[var(--error)]" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-[var(--cream-muted)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
