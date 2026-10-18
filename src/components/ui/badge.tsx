import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "featured" | "success" | "warning" | "error" | "spice";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-white/10 text-[var(--cream)] border border-white/10",
    featured: "bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/40 font-semibold",
    success: "bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/40",
    warning: "bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/40",
    error: "bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/40",
    spice: "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border border-[var(--accent-orange)]/40",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
