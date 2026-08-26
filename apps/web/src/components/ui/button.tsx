import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-gold-600 to-gold-700 text-ivory-50 shadow-soft hover:from-gold-700 hover:to-gold-700 focus-visible:ring-gold-400 active:scale-[0.98]",
  secondary:
    "border border-stone-200 bg-white text-charcoal-900 shadow-soft hover:bg-ivory-100 focus-visible:ring-gold-400 active:scale-[0.98]",
  ghost:
    "text-charcoal-800 hover:bg-ivory-100 focus-visible:ring-gold-400",
};

export function Button({
  className,
  variant = "primary",
  fullWidth = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-14 lg:px-6 lg:text-base",
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
