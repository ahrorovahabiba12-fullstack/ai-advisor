import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className, children, disabled, ...props }, ref) => {
    const base =
      variant === "primary" ? "btn-primary" : variant === "secondary" ? "btn-secondary" : "text-brand-600 font-medium hover:underline";
    return (
      <button ref={ref} className={clsx(base, className)} disabled={disabled || loading} {...props}>
        {loading ? "..." : children}
      </button>
    );
  }
);
Button.displayName = "Button";
